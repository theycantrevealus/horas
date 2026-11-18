import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { type FacilityRepository } from '@repository/interface/facility'
import {
  type PrivilegeCatalogRepository,
  type PrivilegeQuery,
} from '@repository/interface/privilege-catalog'
import { type Coding } from '@repository/model/common/coding'
import { type LocalizedText } from '@repository/model/common/localized-text'
import {
  type PrivilegeCatalogItem,
  type RequiredEvidence,
} from '@repository/model/privilege-catalog-item'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_PRIVILEGE_CATALOG,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import { normalizeLocalizedTexts } from '../structure/localized-texts'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  hasDuplicate,
  isValidExternalCode,
  LIMITS,
  normalizeCatalogCode,
} from './privilege-rules'

const NAME = 'PrivilegeService'

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  committee: /(^|\.)committee$/,
  profession: /(^|\.)profession$/,
  specialty: /(^|\.)specialty$/,
  level: /(^|\.)clinical-level$/,
  evidence: /(^|\.)evidence-type$/,
} as const

/**
 * Limits of the localized texts of an item.
 */
const NAME_LIMITS = { maxItems: 10, maxLength: 200 }
const DESCRIPTION_LIMITS = { maxItems: 10, maxLength: 2000 }
const EVIDENCE_LIMITS = { maxItems: 10, maxLength: 500 }

/**
 * Evidence as sent by a client.
 *
 * @property type - Evidence type code.
 * @property description - What is expected, per language.
 * @property mandatory - Whether the application needs it.
 */
export interface EvidenceInput {
  type: Coding
  description: LocalizedText[]
  mandatory: boolean
}

/**
 * Fields an item shares between creation and edit.
 *
 * @property name - Name per language.
 * @property description - Description per language.
 * @property professions - Professions that may request it.
 * @property specialties - Specialties that may request it; empty means any.
 * @property minClinicalLevel - Required career level, or `null`.
 * @property requiredEvidence - Evidence to attach.
 * @property externalCodes - Matching procedure codes.
 * @property facilityIds - Facilities that may grant it; empty means all.
 */
export interface PrivilegeFields {
  name: LocalizedText[]
  description: LocalizedText[]
  professions: Coding[]
  specialties: Coding[]
  minClinicalLevel: Coding | null
  requiredEvidence: EvidenceInput[]
  externalCodes: Coding[]
  facilityIds: string[]
}

/**
 * Data of a new item.
 *
 * @property code - Catalog code.
 * @property committee - Owning committee code.
 * @property reason - Why, kept in the change history.
 */
export interface CreatePrivilegeInput
  extends Omit<
    PrivilegeFields,
    | 'description'
    | 'specialties'
    | 'minClinicalLevel'
    | 'requiredEvidence'
    | 'externalCodes'
    | 'facilityIds'
  >,
    Partial<
      Pick<
        PrivilegeFields,
        | 'description'
        | 'specialties'
        | 'minClinicalLevel'
        | 'requiredEvidence'
        | 'externalCodes'
        | 'facilityIds'
      >
    > {
  code: string
  committee: Coding
  reason?: string
}

/**
 * Data of an edit: any of the editable fields.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface UpdatePrivilegeInput extends Partial<PrivilegeFields> {
  version?: number
  reason?: string
}

/**
 * Data of a retirement.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface RetirePrivilegeInput {
  version?: number
  reason?: string
}

/**
 * The privilege catalog (the "buku putih", HR plan 4.1): the clinical privileges that can be
 * requested. Never deletes: an item that is no longer offered is retired.
 */
@Injectable()
export class PrivilegeService {
  /**
   * @param catalog - Catalog repository.
   * @param facilities - Facility repository, to check the facilities of an item.
   * @param concepts - Code concepts, to check committees, professions, levels and evidence types.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_PRIVILEGE_CATALOG)
    private readonly catalog: PrivilegeCatalogRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists catalog items ordered by code. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging.
   * @returns The items.
   */
  list(
    tenantId: string,
    query: PrivilegeQuery,
  ): Promise<PrivilegeCatalogItem[]> {
    return this.catalog.findByFilter(tenantId, query)
  }

  /**
   * Returns one item. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Item identifier.
   * @returns The item.
   * @throws NotFoundError `privilege_not_found`.
   */
  get(tenantId: string, id: string): Promise<PrivilegeCatalogItem> {
    return this.load(tenantId, id)
  }

  /**
   * Adds an item to the catalog.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The item.
   * @returns The created item.
   * @throws InvalidRequestError See `check`, plus `invalid_code`, `invalid_committee`,
   * `unknown_code`, `code_retired` or `code_not_in_period`.
   * @throws ConflictError `privilege_exists`.
   */
  create(
    tenantId: string,
    input: CreatePrivilegeInput,
  ): Promise<PrivilegeCatalogItem> {
    return observe(
      this.logger,
      'privilege_create',
      `${NAME}.create`,
      async () => {
        const code = normalizeCatalogCode(input.code)
        if (code === null) {
          throw new InvalidRequestError(
            'invalid_code',
            'The code must have 2 to 30 letters, digits, dots, hyphens, underscores or slashes, for example PD-012.',
          )
        }
        if (!SYSTEMS.committee.test(input.committee.system)) {
          throw new InvalidRequestError(
            'invalid_committee',
            'The committee must come from a committee code system, for example id.committee.',
          )
        }
        await this.concepts.assertActive(tenantId, input.committee)
        const fields = await this.check(tenantId, {
          name: input.name,
          description: input.description ?? [],
          professions: input.professions,
          specialties: input.specialties ?? [],
          minClinicalLevel: input.minClinicalLevel ?? null,
          requiredEvidence: input.requiredEvidence ?? [],
          externalCodes: input.externalCodes ?? [],
          facilityIds: input.facilityIds ?? [],
        })
        if (await this.catalog.findByCode(tenantId, code)) {
          throw this.exists()
        }
        const write = (): Promise<PrivilegeCatalogItem> =>
          this.catalog.create({
            tenant_id: tenantId,
            code,
            committee: {
              system: input.committee.system,
              code: input.committee.code,
            },
            ...this.toStored(fields),
            status: 'active',
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          // Two requests with the same code at once: the unique index decided.
          throw error instanceof RepositoryConflictError ? this.exists() : error
        }
      },
    )
  }

  /**
   * Edits an active item. Fields that are not sent stay as they are; a list that is sent replaces
   * the old one (HR plan 4.1 PC11).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Item identifier.
   * @param input - Fields to change, optional version and reason.
   * @returns The updated item.
   * @throws NotFoundError `privilege_not_found`.
   * @throws InvalidRequestError `empty_update`, `privilege_retired` and the validation codes of
   * `check`.
   * @throws ConflictError `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdatePrivilegeInput,
  ): Promise<PrivilegeCatalogItem> {
    return observe(
      this.logger,
      'privilege_update',
      `${NAME}.update`,
      async () => {
        const item = await this.loadActive(tenantId, id)
        const sent = [
          input.name,
          input.description,
          input.professions,
          input.specialties,
          input.minClinicalLevel,
          input.requiredEvidence,
          input.externalCodes,
          input.facilityIds,
        ]
        if (sent.every((value) => value === undefined)) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const fields = await this.check(tenantId, {
          name: input.name ?? item.name,
          description: input.description ?? item.description,
          professions: input.professions ?? item.professions,
          specialties: input.specialties ?? item.specialties,
          minClinicalLevel:
            input.minClinicalLevel === undefined
              ? item.min_clinical_level
              : input.minClinicalLevel,
          requiredEvidence:
            input.requiredEvidence ??
            item.required_evidence.map((evidence) => ({
              type: evidence.type,
              description: evidence.description,
              mandatory: evidence.mandatory,
            })),
          externalCodes: input.externalCodes ?? item.external_codes,
          facilityIds: input.facilityIds ?? item.facility_ids,
        })
        this.assertVersion(item, input.version)
        return this.write(input.reason, () =>
          this.catalog.update(item.id, this.toStored(fields), {
            expectedVersion: input.version,
          }),
        )
      },
    )
  }

  /**
   * Stops new requests for an item. Existing grants stay (HR plan 4.1 PC9). Final: there is no way
   * back.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Item identifier.
   * @param input - Optional version and reason.
   * @returns The retired item.
   * @throws NotFoundError `privilege_not_found`.
   * @throws InvalidRequestError `privilege_retired`.
   * @throws ConflictError `stale_version`.
   */
  retire(
    tenantId: string,
    id: string,
    input: RetirePrivilegeInput,
  ): Promise<PrivilegeCatalogItem> {
    return observe(
      this.logger,
      'privilege_retire',
      `${NAME}.retire`,
      async () => {
        const item = await this.loadActive(tenantId, id)
        this.assertVersion(item, input.version)
        return this.write(input.reason, () =>
          this.catalog.update(
            item.id,
            { status: 'retired' },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Checks the editable fields of an item against their code systems and the tenant, and cleans
   * them (HR plan 4.1 PC2 and PC4 to PC8).
   *
   * @param tenantId - Tenant of the caller.
   * @param fields - The fields as they will be stored.
   * @returns The cleaned fields.
   * @throws InvalidRequestError `invalid_name`, `invalid_description`, `professions_required`,
   * `invalid_professions`, `invalid_profession`, `invalid_specialties`, `invalid_specialty`,
   * `invalid_clinical_level`, `invalid_evidence`, `invalid_evidence_type`, `invalid_external_code`,
   * `duplicate_code`, `duplicate_facility`, `invalid_facilities`, `facility_not_found`,
   * `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async check(
    tenantId: string,
    fields: PrivilegeFields,
  ): Promise<PrivilegeFields> {
    const name = normalizeLocalizedTexts(fields.name, NAME_LIMITS)
    if (name === null) {
      throw new InvalidRequestError(
        'invalid_name',
        'The name needs 1 to 10 texts of 1 to 200 characters, one per language.',
      )
    }
    const description =
      fields.description.length === 0
        ? []
        : normalizeLocalizedTexts(fields.description, DESCRIPTION_LIMITS)
    if (description === null) {
      throw new InvalidRequestError(
        'invalid_description',
        'The description needs at most 10 texts of 1 to 2000 characters, one per language.',
      )
    }
    if (fields.professions.length === 0) {
      throw new InvalidRequestError(
        'professions_required',
        'An item needs at least one profession that may request it.',
      )
    }
    const professions = await this.codings(
      tenantId,
      fields.professions,
      SYSTEMS.profession,
      LIMITS.professions,
      'invalid_professions',
      'invalid_profession',
    )
    const specialties = await this.codings(
      tenantId,
      fields.specialties,
      SYSTEMS.specialty,
      LIMITS.specialties,
      'invalid_specialties',
      'invalid_specialty',
    )
    let level: Coding | null = null
    if (fields.minClinicalLevel) {
      if (!SYSTEMS.level.test(fields.minClinicalLevel.system)) {
        throw new InvalidRequestError(
          'invalid_clinical_level',
          'The level must come from a clinical-level code system.',
        )
      }
      await this.concepts.assertActive(tenantId, fields.minClinicalLevel)
      level = {
        system: fields.minClinicalLevel.system,
        code: fields.minClinicalLevel.code,
      }
    }
    const evidence = await this.evidence(tenantId, fields.requiredEvidence)
    if (
      fields.externalCodes.length > LIMITS.externalCodes ||
      fields.externalCodes.some((coding) => !isValidExternalCode(coding))
    ) {
      throw new InvalidRequestError(
        'invalid_external_code',
        'There can be at most 10 external codes, each with a system and a code of 1 to 64 characters without spaces.',
      )
    }
    if (hasDuplicate(fields.externalCodes)) {
      throw new InvalidRequestError(
        'duplicate_code',
        'An external code appears twice.',
      )
    }
    await this.assertFacilities(tenantId, fields.facilityIds)
    return {
      name,
      description,
      professions,
      specialties,
      minClinicalLevel: level,
      requiredEvidence: evidence,
      externalCodes: fields.externalCodes.map(({ system, code }) => ({
        system,
        code,
      })),
      facilityIds: fields.facilityIds,
    }
  }

  /**
   * Checks a list of codings of one code system: size, no duplicates, system name, active.
   *
   * @param tenantId - Tenant of the caller.
   * @param items - The codings.
   * @param pattern - Allowed system name.
   * @param max - Most entries.
   * @param listCode - Error code for a list that is too long.
   * @param itemCode - Error code for a coding of the wrong system.
   * @returns The cleaned codings.
   * @throws InvalidRequestError `duplicate_code` and the two given codes.
   */
  private async codings(
    tenantId: string,
    items: Coding[],
    pattern: RegExp,
    max: number,
    listCode: string,
    itemCode: string,
  ): Promise<Coding[]> {
    if (items.length > max) {
      throw new InvalidRequestError(
        listCode,
        `There can be at most ${max} entries.`,
      )
    }
    if (items.some((coding) => !pattern.test(coding.system))) {
      throw new InvalidRequestError(
        itemCode,
        'A code comes from the wrong code system.',
      )
    }
    if (hasDuplicate(items)) {
      throw new InvalidRequestError(
        'duplicate_code',
        'A code appears twice in the list.',
      )
    }
    for (const coding of items) {
      await this.concepts.assertActive(tenantId, coding)
    }
    return items.map(({ system, code }) => ({ system, code }))
  }

  /**
   * Checks the required evidence of an item (HR plan 4.1 PC7).
   *
   * @param tenantId - Tenant of the caller.
   * @param items - The evidence as sent.
   * @returns The cleaned evidence.
   * @throws InvalidRequestError `invalid_evidence`, `invalid_evidence_type` or `duplicate_code`.
   */
  private async evidence(
    tenantId: string,
    items: EvidenceInput[],
  ): Promise<EvidenceInput[]> {
    if (items.length > LIMITS.evidence) {
      throw new InvalidRequestError(
        'invalid_evidence',
        'There can be at most 20 pieces of required evidence.',
      )
    }
    const cleaned: RequiredEvidence[] = []
    for (const item of items) {
      if (!SYSTEMS.evidence.test(item.type.system)) {
        throw new InvalidRequestError(
          'invalid_evidence_type',
          'The evidence type must come from an evidence-type code system.',
        )
      }
      const description = normalizeLocalizedTexts(
        item.description,
        EVIDENCE_LIMITS,
      )
      if (description === null) {
        throw new InvalidRequestError(
          'invalid_evidence',
          'Each piece of evidence needs 1 to 10 description texts of 1 to 500 characters, one per language.',
        )
      }
      cleaned.push({
        type: { system: item.type.system, code: item.type.code },
        description,
        mandatory: item.mandatory,
      })
    }
    if (hasDuplicate(cleaned.map((item) => item.type))) {
      throw new InvalidRequestError(
        'duplicate_code',
        'An evidence type appears twice.',
      )
    }
    for (const item of cleaned) {
      await this.concepts.assertActive(tenantId, item.type)
    }
    return cleaned
  }

  /**
   * Checks the facilities of an item: at most 50, no duplicates, each in the tenant and not
   * deleted (HR plan 4.1 PC6).
   *
   * @param tenantId - Tenant of the caller.
   * @param ids - Facility identifiers.
   * @throws InvalidRequestError `invalid_facilities`, `duplicate_facility` or `facility_not_found`.
   */
  private async assertFacilities(
    tenantId: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length > LIMITS.facilities) {
      throw new InvalidRequestError(
        'invalid_facilities',
        'There can be at most 50 facilities.',
      )
    }
    if (new Set(ids).size !== ids.length) {
      throw new InvalidRequestError(
        'duplicate_facility',
        'A facility appears twice.',
      )
    }
    for (const id of ids) {
      const facility = await this.facilities.findOne(id)
      if (!facility || facility.tenant_id !== tenantId || facility.deleted_at) {
        throw new InvalidRequestError(
          'facility_not_found',
          'A facility was not found.',
        )
      }
    }
  }

  /**
   * Maps the cleaned fields to the stored shape.
   *
   * @param fields - The cleaned fields.
   * @returns The stored fields.
   */
  private toStored(fields: PrivilegeFields): Pick<
    PrivilegeCatalogItem,
    | 'name'
    | 'description'
    | 'professions'
    | 'specialties'
    | 'min_clinical_level'
    | 'required_evidence'
    | 'external_codes'
    | 'facility_ids'
  > {
    return {
      name: fields.name,
      description: fields.description,
      professions: fields.professions,
      specialties: fields.specialties,
      min_clinical_level: fields.minClinicalLevel,
      required_evidence: fields.requiredEvidence,
      external_codes: fields.externalCodes,
      facility_ids: fields.facilityIds,
    }
  }

  /**
   * Loads an item of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Item identifier.
   * @returns The item.
   * @throws NotFoundError `privilege_not_found`.
   */
  private async load(
    tenantId: string,
    id: string,
  ): Promise<PrivilegeCatalogItem> {
    const item = await this.catalog.findOne(id)
    if (!item || item.tenant_id !== tenantId || item.deleted_at) {
      throw this.notFound()
    }
    return item
  }

  /**
   * Loads an item that is still active.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Item identifier.
   * @returns The item.
   * @throws NotFoundError `privilege_not_found`.
   * @throws InvalidRequestError `privilege_retired`.
   */
  private async loadActive(
    tenantId: string,
    id: string,
  ): Promise<PrivilegeCatalogItem> {
    const item = await this.load(tenantId, id)
    if (item.status === 'retired') {
      throw new InvalidRequestError(
        'privilege_retired',
        'The privilege is retired and cannot be changed.',
      )
    }
    return item
  }

  /**
   * Refuses a stale version before any write.
   *
   * @param item - The item as read.
   * @param version - Version the caller read.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(
    item: PrivilegeCatalogItem,
    version: number | undefined,
  ): void {
    if (version !== undefined && version !== item.version) {
      throw new ConflictError(
        'stale_version',
        'The privilege was changed by someone else. Reload it and try again.',
      )
    }
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private async write(
    reason: string | undefined,
    write: () => Promise<PrivilegeCatalogItem>,
  ): Promise<PrivilegeCatalogItem> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new ConflictError(
          'stale_version',
          'The privilege was changed by someone else. Reload it and try again.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * @returns The not-found error for an item.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'privilege_not_found',
      'The privilege was not found.',
    )
  }

  /**
   * @returns The conflict for a second item with the same code.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'privilege_exists',
      'A privilege with this code already exists.',
    )
  }
}
