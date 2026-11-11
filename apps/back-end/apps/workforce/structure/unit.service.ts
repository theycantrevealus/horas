import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { type Page } from '@utility/database/interface'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import {
  compareLocalDates,
  isLocalDate,
  todayInZone,
} from '@utility/validation/local-date'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type Coding } from '@repository/model/common/coding'
import { type ExternalId } from '@repository/model/common/external-id'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type Facility } from '@repository/model/facility'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { CODE_MESSAGE, CODE_PATTERN } from './codes'
import { normalizeExternalIds } from './external-ids'
import { normalizeLocalizedTexts } from './localized-texts'
import { buildUnitTree, type UnitTreeNode } from './unit-tree'

const NAME = 'UnitService'

/**
 * Most levels the chart of a facility can have; a top unit is level 1 (HR plan U5).
 */
export const MAX_UNIT_LEVELS = 10

/**
 * Most units the tree endpoint reads for one facility or subtree (HR plan U13).
 */
export const MAX_TREE_UNITS = 2000

/**
 * A code system of unit types ends in this name, after an optional country prefix.
 */
const UNIT_TYPE_SYSTEM = /(^|\.)unit-type$/

/**
 * Filters and paging of the unit list.
 *
 * @property facilityId - Facility whose units are listed.
 * @property parentId - Only direct children of this unit.
 * @property status - Only units with this status.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListUnitsInput {
  facilityId: string
  parentId?: string
  status?: OrganizationUnit['status']
  limit?: number
  offset?: number
}

/**
 * Selection of the tree endpoint.
 *
 * @property facilityId - Facility whose chart is read.
 * @property rootId - Only this unit's subtree.
 * @property includeClosed - Also closed units; by default only active ones.
 */
export interface UnitTreeInput {
  facilityId: string
  rootId?: string
  includeClosed?: boolean
}

/**
 * Data of a new unit.
 *
 * @property facilityId - Facility of the unit; cannot change later.
 * @property code - Code, unique inside the facility.
 * @property name - Name per language.
 * @property type - Unit type from the unit-type code system.
 * @property parentId - Parent unit, or none for a top unit.
 * @property isClinical - Patients are treated here; defaults from the type.
 * @property startDate - First day of the unit; defaults to today in the facility's time zone.
 * @property externalIds - Codes given by other systems.
 */
export interface CreateUnitInput {
  facilityId: string
  code: string
  name: LocalizedText[]
  type: Coding
  parentId?: string | null
  isClinical?: boolean
  startDate?: string
  externalIds?: ExternalId[]
}

/**
 * Changes to a unit. The facility, code, parent, status and period are not here (HR plan U1, U2,
 * U9): the parent changes through `move`, the status and period through `close`.
 *
 * @property name - New names, replacing the old ones.
 * @property type - New unit type.
 * @property isClinical - New clinical flag.
 * @property externalIds - New identifiers, replacing the old ones.
 * @property version - Version the caller read.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface UpdateUnitInput {
  name?: LocalizedText[]
  type?: Coding
  isClinical?: boolean
  externalIds?: ExternalId[]
  version?: number
  reason?: string
}

/**
 * Data of a move.
 *
 * @property parentId - New parent, or `null` for a top unit.
 * @property version - Version the caller read.
 * @property reason - Why the unit moves, kept in the change history of every unit moved.
 */
export interface MoveUnitInput {
  parentId: string | null
  version?: number
  reason?: string
}

/**
 * Data of a close.
 *
 * @property endDate - Last day of the unit; defaults to today in the facility's time zone.
 * @property version - Version the caller read.
 * @property reason - Why the unit closes.
 */
export interface CloseUnitInput {
  endDate?: string
  version?: number
  reason?: string
}

/**
 * Organization units of a facility: the organization chart. Never deletes: a unit is closed.
 */
@Injectable()
export class UnitService {
  /**
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the facility of a unit and its time zone.
   * @param concepts - Code concepts, to check unit types.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the units of a facility, ordered by code. A facility of another tenant or one that
   * does not exist gives an empty page (HR plan U12). Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Facility, filters and paging.
   * @returns One page of units.
   */
  list(
    tenantId: string,
    input: ListUnitsInput,
  ): Promise<Page<OrganizationUnit>> {
    return this.units.findAll({
      where: {
        tenant_id: { eq: tenantId },
        facility_id: { eq: input.facilityId },
        ...(input.parentId ? { parent_id: { eq: input.parentId } } : {}),
        ...(input.status ? { status: { eq: input.status } } : {}),
      },
      orderBy: { field: 'code' },
      withPagination: true,
      limit: input.limit,
      offset: input.offset,
    })
  }

  /**
   * Returns the organization chart of a facility as nested nodes (HR plan U13). A facility of
   * another tenant or one that does not exist gives an empty chart. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Facility and selection.
   * @returns The root nodes, ordered by code at every level.
   * @throws NotFoundError `unit_not_found` when `rootId` is not a unit of the facility.
   * @throws InvalidRequestError `tree_too_large` when more than 2,000 units would be read.
   */
  async tree(tenantId: string, input: UnitTreeInput): Promise<UnitTreeNode[]> {
    let units: OrganizationUnit[]
    if (input.rootId === undefined) {
      units = await this.units.findByFacility(
        tenantId,
        input.facilityId,
        MAX_TREE_UNITS + 1,
      )
    } else {
      const root = await this.load(tenantId, input.rootId)
      if (root.facility_id !== input.facilityId) {
        throw this.notFound()
      }
      units = [root, ...(await this.units.findDescendants(tenantId, root.id))]
      units.sort((left, right) => left.code.localeCompare(right.code))
    }
    if (units.length > MAX_TREE_UNITS) {
      throw new InvalidRequestError(
        'tree_too_large',
        'The chart has more than 2,000 units. Read it level by level with the parent filter of the list.',
      )
    }
    const shown = input.includeClosed
      ? units
      : units.filter(
          (unit) => unit.status === 'active' || unit.id === input.rootId,
        )
    return buildUnitTree(shown, input.rootId)
  }

  /**
   * Returns one unit. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Unit identifier.
   * @returns The unit.
   * @throws NotFoundError `unit_not_found` when it does not exist in the tenant.
   */
  get(tenantId: string, id: string): Promise<OrganizationUnit> {
    return this.load(tenantId, id)
  }

  /**
   * Creates a unit, active, in a usable facility, optionally under an active parent.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The unit.
   * @returns The created unit.
   * @throws InvalidRequestError `invalid_code`, `invalid_name`, `invalid_external_ids`,
   * `invalid_type`, `unknown_code`, `code_retired`, `code_not_in_period`, `invalid_start_date`,
   * `facility_not_found`, `facility_inactive`, `parent_not_found`, `parent_closed` or `too_deep`.
   * @throws ConflictError `unit_exists` when the code is taken in the facility.
   */
  create(tenantId: string, input: CreateUnitInput): Promise<OrganizationUnit> {
    return observe(this.logger, 'unit_create', `${NAME}.create`, async () => {
      if (!CODE_PATTERN.test(input.code)) {
        throw new InvalidRequestError('invalid_code', CODE_MESSAGE)
      }
      const name = this.checkNames(input.name)
      const externalIds = this.checkExternalIds(input.externalIds ?? [])
      this.checkTypeSystem(input.type)
      if (input.startDate !== undefined && !isLocalDate(input.startDate)) {
        throw new InvalidRequestError(
          'invalid_start_date',
          'The start date must be a date like 2026-01-31.',
        )
      }
      const facility = await this.usableFacility(tenantId, input.facilityId)
      const concept = await this.concepts.assertActive(tenantId, input.type)
      const parent = input.parentId
        ? await this.usableParent(tenantId, facility.id, input.parentId)
        : null
      if (parent && parent.ancestor_ids.length + 2 > MAX_UNIT_LEVELS) {
        throw this.tooDeep()
      }
      if (await this.units.findByCode(tenantId, facility.id, input.code)) {
        throw this.exists()
      }
      const clinicalDefault = concept.properties?.clinical_default
      try {
        return await this.units.create({
          tenant_id: tenantId,
          organization_id: facility.organization_id,
          facility_id: facility.id,
          code: input.code,
          name,
          type: { system: input.type.system, code: input.type.code },
          parent_id: parent ? parent.id : null,
          ancestor_ids: parent ? [...parent.ancestor_ids, parent.id] : [],
          is_clinical: input.isClinical ?? clinicalDefault === true,
          external_ids: externalIds,
          period: {
            start: input.startDate ?? todayInZone(facility.timezone),
            end: null,
          },
          status: 'active',
        })
      } catch (error: unknown) {
        // Two requests with the same code at once: the unique index decides.
        throw error instanceof RepositoryConflictError ? this.exists() : error
      }
    })
  }

  /**
   * Changes the names, type, clinical flag or external ids of an open unit.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Unit identifier.
   * @param input - Fields to change.
   * @returns The updated unit.
   * @throws InvalidRequestError `empty_update`, `invalid_name`, `invalid_external_ids`,
   * `invalid_type`, `unknown_code`, `code_retired`, `code_not_in_period` or `unit_closed`.
   * @throws NotFoundError `unit_not_found`.
   * @throws ConflictError `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateUnitInput,
  ): Promise<OrganizationUnit> {
    return observe(this.logger, 'unit_update', `${NAME}.update`, async () => {
      const changes: Partial<
        Pick<OrganizationUnit, 'name' | 'type' | 'is_clinical' | 'external_ids'>
      > = {}
      if (input.name !== undefined) {
        changes.name = this.checkNames(input.name)
      }
      if (input.type !== undefined) {
        this.checkTypeSystem(input.type)
        changes.type = { system: input.type.system, code: input.type.code }
      }
      if (input.isClinical !== undefined) {
        changes.is_clinical = input.isClinical
      }
      if (input.externalIds !== undefined) {
        changes.external_ids = this.checkExternalIds(input.externalIds)
      }
      if (Object.keys(changes).length === 0) {
        throw new InvalidRequestError(
          'empty_update',
          'Send at least one field to change.',
        )
      }
      const unit = await this.loadOpen(tenantId, id)
      if (input.type !== undefined) {
        await this.concepts.assertActive(tenantId, input.type)
      }
      return this.write(unit.id, input.reason, () =>
        this.units.update(unit.id, changes, { expectedVersion: input.version }),
      )
    })
  }

  /**
   * Moves a unit, with every unit below it, under another unit of the same facility or to the top.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Unit identifier.
   * @param input - New parent and optional version and reason.
   * @returns The moved unit.
   * @throws InvalidRequestError `unit_closed`, `same_parent`, `unit_cycle`, `parent_not_found`,
   * `parent_closed` or `too_deep`.
   * @throws NotFoundError `unit_not_found`.
   * @throws ConflictError `stale_version` when the unit or the chart changed meanwhile.
   */
  move(
    tenantId: string,
    id: string,
    input: MoveUnitInput,
  ): Promise<OrganizationUnit> {
    return observe(this.logger, 'unit_move', `${NAME}.move`, async () => {
      const unit = await this.loadOpen(tenantId, id)
      if (input.parentId === unit.parent_id) {
        throw new InvalidRequestError(
          'same_parent',
          'The unit is already under this parent.',
        )
      }
      let newLevel = 1
      if (input.parentId !== null) {
        if (input.parentId === unit.id) {
          throw this.cycle()
        }
        const parent = await this.usableParent(
          tenantId,
          unit.facility_id,
          input.parentId,
        )
        if (parent.ancestor_ids.includes(unit.id)) {
          throw this.cycle()
        }
        newLevel = parent.ancestor_ids.length + 2
      }
      const descendants = await this.units.findDescendants(tenantId, unit.id)
      const height = descendants.reduce(
        (deepest, item) =>
          Math.max(
            deepest,
            item.ancestor_ids.length - unit.ancestor_ids.length,
          ),
        0,
      )
      if (newLevel + height > MAX_UNIT_LEVELS) {
        throw this.tooDeep()
      }
      return this.write(unit.id, input.reason, () =>
        this.units.moveSubtree(unit.id, input.parentId, {
          expectedVersion: input.version,
        }),
      )
    })
  }

  /**
   * Closes an open unit with no active child unit. A closed unit stays for history and cannot be
   * reopened (HR plan U9).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Unit identifier.
   * @param input - End date and optional version and reason.
   * @returns The closed unit.
   * @throws InvalidRequestError `unit_closed` or `invalid_end_date`.
   * @throws NotFoundError `unit_not_found`.
   * @throws ConflictError `unit_in_use` when it has active child units; `stale_version`.
   */
  close(
    tenantId: string,
    id: string,
    input: CloseUnitInput,
  ): Promise<OrganizationUnit> {
    return observe(this.logger, 'unit_close', `${NAME}.close`, async () => {
      if (input.endDate !== undefined && !isLocalDate(input.endDate)) {
        throw this.invalidEnd()
      }
      const unit = await this.loadOpen(tenantId, id)
      const facility = await this.facilities.findOne(unit.facility_id, {
        withSoft: true,
      })
      if (!facility) {
        throw this.notFound()
      }
      const endDate = input.endDate ?? todayInZone(facility.timezone)
      const start = unit.period?.start
      if (start !== undefined && compareLocalDates(endDate, start) < 0) {
        throw this.invalidEnd()
      }
      const children = await this.units.findChildren(tenantId, unit.id)
      if (children.some((child) => child.status === 'active')) {
        throw new ConflictError(
          'unit_in_use',
          'The unit still has active units below it. Close or move them first.',
        )
      }
      return this.write(unit.id, input.reason, () =>
        this.units.update(
          unit.id,
          {
            status: 'closed',
            period: { start: start ?? endDate, end: endDate },
          },
          { expectedVersion: input.version },
        ),
      )
    })
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param id - Unit identifier, for a not-found rejection.
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private async write(
    id: string,
    reason: string | undefined,
    write: () => Promise<OrganizationUnit>,
  ): Promise<OrganizationUnit> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new ConflictError(
          'stale_version',
          'The unit or the organization chart was changed by someone else. Reload and try again.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * Loads a unit of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Unit identifier.
   * @returns The unit.
   * @throws NotFoundError `unit_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<OrganizationUnit> {
    const unit = await this.units.findOne(id)
    if (!unit || unit.tenant_id !== tenantId) {
      throw this.notFound()
    }
    return unit
  }

  /**
   * Loads a unit that can still be changed.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Unit identifier.
   * @returns The open unit.
   * @throws NotFoundError `unit_not_found`.
   * @throws InvalidRequestError `unit_closed`.
   */
  private async loadOpen(
    tenantId: string,
    id: string,
  ): Promise<OrganizationUnit> {
    const unit = await this.load(tenantId, id)
    if (unit.status === 'closed') {
      throw new InvalidRequestError(
        'unit_closed',
        'The unit is closed and cannot be changed.',
      )
    }
    return unit
  }

  /**
   * Checks the facility of a new unit: it exists in the tenant, is not soft-deleted (the
   * repository hides soft-deleted records) and is active (HR plan U4). A missing, deleted and
   * foreign facility give the same answer.
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility identifier from the request.
   * @returns The facility.
   * @throws InvalidRequestError `facility_not_found` or `facility_inactive`.
   */
  private async usableFacility(
    tenantId: string,
    facilityId: string,
  ): Promise<Facility> {
    const facility = await this.facilities.findOne(facilityId)
    if (!facility || facility.tenant_id !== tenantId) {
      throw new InvalidRequestError(
        'facility_not_found',
        'The facility was not found.',
      )
    }
    if (facility.status !== 'active') {
      throw new InvalidRequestError(
        'facility_inactive',
        'The facility is inactive. Activate it before adding units.',
      )
    }
    return facility
  }

  /**
   * Checks a parent: it exists in the tenant and the facility and is active (HR plan U5). A
   * missing, foreign and other-facility parent give the same answer.
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility the child belongs to.
   * @param parentId - Parent identifier from the request.
   * @returns The parent.
   * @throws InvalidRequestError `parent_not_found` or `parent_closed`.
   */
  private async usableParent(
    tenantId: string,
    facilityId: string,
    parentId: string,
  ): Promise<OrganizationUnit> {
    const parent = await this.units.findOne(parentId)
    if (
      !parent ||
      parent.tenant_id !== tenantId ||
      parent.facility_id !== facilityId
    ) {
      throw new InvalidRequestError(
        'parent_not_found',
        'The parent unit was not found.',
      )
    }
    if (parent.status === 'closed') {
      throw new InvalidRequestError(
        'parent_closed',
        'The parent unit is closed and cannot receive units.',
      )
    }
    return parent
  }

  /**
   * Checks that a code belongs to a unit-type system (HR plan U3).
   *
   * @param type - The type as sent.
   * @throws InvalidRequestError `invalid_type`.
   */
  private checkTypeSystem(type: Coding): void {
    if (!UNIT_TYPE_SYSTEM.test(type.system)) {
      throw new InvalidRequestError(
        'invalid_type',
        'The type must come from a unit-type code system, for example id.unit-type.',
      )
    }
  }

  /**
   * Checks the names of a unit.
   *
   * @param names - Names as sent.
   * @returns The cleaned names.
   * @throws InvalidRequestError `invalid_name`.
   */
  private checkNames(names: LocalizedText[]): LocalizedText[] {
    const cleaned = normalizeLocalizedTexts(names, {
      maxItems: 10,
      maxLength: 200,
    })
    if (!cleaned) {
      throw new InvalidRequestError(
        'invalid_name',
        'Give 1 to 10 names, each with a language tag and text up to 200 characters, one per language.',
      )
    }
    return cleaned
  }

  /**
   * Checks the identifiers given by other systems.
   *
   * @param externalIds - Identifiers as sent.
   * @returns The cleaned identifiers.
   * @throws InvalidRequestError `invalid_external_ids`.
   */
  private checkExternalIds(externalIds: ExternalId[]): ExternalId[] {
    const cleaned = normalizeExternalIds(externalIds)
    if (!cleaned) {
      throw new InvalidRequestError(
        'invalid_external_ids',
        'External ids need a system and a value each, at most 20, with no repeated system.',
      )
    }
    return cleaned
  }

  /**
   * @returns The rejection for a taken code.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'unit_exists',
      'A unit with this code already exists in the facility.',
    )
  }

  /**
   * @returns The rejection for a unit that is not in the caller's tenant.
   */
  private notFound(): NotFoundError {
    return new NotFoundError('unit_not_found', 'The unit was not found.')
  }

  /**
   * @returns The rejection for a chart deeper than the limit.
   */
  private tooDeep(): InvalidRequestError {
    return new InvalidRequestError(
      'too_deep',
      'The organization chart can have at most 10 levels.',
    )
  }

  /**
   * @returns The rejection for a move under the unit's own subtree.
   */
  private cycle(): InvalidRequestError {
    return new InvalidRequestError(
      'unit_cycle',
      'A unit cannot be moved under itself or one of its own units.',
    )
  }

  /**
   * @returns The rejection for a bad end date.
   */
  private invalidEnd(): InvalidRequestError {
    return new InvalidRequestError(
      'invalid_end_date',
      'The end date must be a date like 2026-01-31, not before the start of the unit.',
    )
  }
}
