import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { type Page } from '@utility/database/interface'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { canonicalTimeZone } from '@utility/validation/is-time-zone'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationRepository } from '@repository/interface/organization'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type Address } from '@repository/model/common/address'
import { type ExternalId } from '@repository/model/common/external-id'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type Facility } from '@repository/model/facility'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION,
  REPOSITORY_ORGANIZATION_UNIT,
} from '@repository/token'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { normalizeAddress } from './address'
import { CODE_MESSAGE, CODE_PATTERN } from './codes'
import { normalizeExternalIds } from './external-ids'
import { normalizeLocalizedTexts } from './localized-texts'

const NAME = 'FacilityService'

/**
 * Most holiday calendars one facility can use (HR plan F7).
 */
const MAX_HOLIDAY_CALENDARS = 10

/**
 * Filters and paging of the facility list.
 *
 * @property organizationId - Only facilities of this organization.
 * @property status - Only facilities with this status.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListFacilitiesInput {
  organizationId?: string
  status?: Facility['status']
  limit?: number
  offset?: number
}

/**
 * Data of a new facility.
 *
 * @property organizationId - Organization that runs the facility.
 * @property code - Unique code inside the tenant.
 * @property name - Name per language.
 * @property timezone - IANA time zone name.
 * @property address - Site address.
 * @property holidayCalendarCodes - Holiday calendars that apply.
 * @property externalIds - Codes given by regulators.
 */
export interface CreateFacilityInput {
  organizationId: string
  code: string
  name: LocalizedText[]
  timezone: string
  address?: Address | null
  holidayCalendarCodes?: string[]
  externalIds?: ExternalId[]
}

/**
 * Changes to a facility. `organizationId`, `code` and `timezone` are not here: they cannot
 * change (HR plan F2).
 *
 * @property name - New names, replacing the old ones.
 * @property address - New address, or `null` to clear it.
 * @property holidayCalendarCodes - New list of calendars, replacing the old one.
 * @property externalIds - New list of identifiers, replacing the old one.
 * @property status - New status.
 * @property version - Version the caller read; the edit fails when someone changed the record since.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface UpdateFacilityInput {
  name?: LocalizedText[]
  address?: Address | null
  holidayCalendarCodes?: string[]
  externalIds?: ExternalId[]
  status?: Facility['status']
  version?: number
  reason?: string
}

/**
 * Facilities (hospital and clinic sites) of a tenant. Never deletes: a facility is set inactive.
 */
@Injectable()
export class FacilityService {
  /**
   * @param facilities - Facility repository.
   * @param organizations - Organization repository, to check the employer of a new facility.
   * @param units - Organization unit repository, to refuse deactivating a facility that has active units.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_ORGANIZATION)
    private readonly organizations: OrganizationRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the facilities of a tenant, ordered by code. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Filters and paging.
   * @returns One page of facilities.
   */
  list(tenantId: string, input: ListFacilitiesInput): Promise<Page<Facility>> {
    return this.facilities.findAll({
      where: {
        tenant_id: { eq: tenantId },
        ...(input.organizationId
          ? { organization_id: { eq: input.organizationId } }
          : {}),
        ...(input.status ? { status: { eq: input.status } } : {}),
      },
      orderBy: { field: 'code' },
      withPagination: true,
      limit: input.limit,
      offset: input.offset,
    })
  }

  /**
   * Returns one facility. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Facility identifier.
   * @returns The facility.
   * @throws NotFoundError `facility_not_found` when it does not exist in the tenant.
   */
  get(tenantId: string, id: string): Promise<Facility> {
    return this.load(tenantId, id)
  }

  /**
   * Creates a facility, active, for an active organization of the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The facility.
   * @returns The created facility.
   * @throws InvalidRequestError `invalid_code`, `invalid_timezone`, `invalid_name`, `invalid_address`,
   * `invalid_holiday_calendars`, `invalid_external_ids`, `organization_not_found` (missing, soft-deleted
   * or of another tenant) or `organization_inactive` (HR plan F1).
   * @throws ConflictError `facility_exists` when the code is taken.
   */
  create(tenantId: string, input: CreateFacilityInput): Promise<Facility> {
    return observe(
      this.logger,
      'facility_create',
      `${NAME}.create`,
      async () => {
        if (!CODE_PATTERN.test(input.code)) {
          throw new InvalidRequestError('invalid_code', CODE_MESSAGE)
        }
        const timezone = canonicalTimeZone(input.timezone)
        if (!timezone) {
          throw new InvalidRequestError(
            'invalid_timezone',
            'The time zone is not an IANA time zone name, for example Asia/Jakarta.',
          )
        }
        const name = this.checkNames(input.name)
        const address = this.checkAddress(input.address ?? null)
        const holidayCalendarCodes = this.checkCalendars(
          input.holidayCalendarCodes ?? [],
        )
        const externalIds = this.checkExternalIds(input.externalIds ?? [])
        await this.assertOrganizationUsable(tenantId, input.organizationId)
        if (await this.facilities.findByCode(tenantId, input.code)) {
          throw this.exists()
        }
        try {
          return await this.facilities.create({
            tenant_id: tenantId,
            organization_id: input.organizationId,
            code: input.code,
            name,
            address,
            timezone,
            holiday_calendar_codes: holidayCalendarCodes,
            external_ids: externalIds,
            status: 'active',
          })
        } catch (error: unknown) {
          // Two requests with the same code at once: the unique index decides.
          throw error instanceof RepositoryConflictError ? this.exists() : error
        }
      },
    )
  }

  /**
   * Changes the names, address, holiday calendars, external ids or status of a facility.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Facility identifier.
   * @param input - Fields to change.
   * @returns The updated facility.
   * @throws InvalidRequestError `empty_update`, `invalid_name`, `invalid_address`,
   * `invalid_holiday_calendars` or `invalid_external_ids`.
   * @throws NotFoundError `facility_not_found`.
   * @throws ConflictError `stale_version` when `version` is given and the record changed since;
   * `facility_in_use` when it is set inactive while it has active units (HR plan U11).
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateFacilityInput,
  ): Promise<Facility> {
    return observe(
      this.logger,
      'facility_update',
      `${NAME}.update`,
      async () => {
        const changes: Partial<
          Pick<
            Facility,
            | 'name'
            | 'address'
            | 'holiday_calendar_codes'
            | 'external_ids'
            | 'status'
          >
        > = {}
        if (input.name !== undefined) {
          changes.name = this.checkNames(input.name)
        }
        if (input.address !== undefined) {
          changes.address = this.checkAddress(input.address)
        }
        if (input.holidayCalendarCodes !== undefined) {
          changes.holiday_calendar_codes = this.checkCalendars(
            input.holidayCalendarCodes,
          )
        }
        if (input.externalIds !== undefined) {
          changes.external_ids = this.checkExternalIds(input.externalIds)
        }
        if (input.status !== undefined) {
          changes.status = input.status
        }
        if (Object.keys(changes).length === 0) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const facility = await this.load(tenantId, id)
        if (
          input.status === 'inactive' &&
          facility.status !== 'inactive' &&
          (await this.units.findActiveByFacility(tenantId, facility.id, 1))
            .length > 0
        ) {
          throw new ConflictError(
            'facility_in_use',
            'The facility still has active units. Close them first.',
          )
        }
        const write = () =>
          this.facilities.update(facility.id, changes, {
            expectedVersion: input.version,
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw new ConflictError(
              'stale_version',
              'The facility was changed by someone else. Reload it and try again.',
            )
          }
          if (error instanceof RepositoryNotFoundError) {
            throw this.notFound()
          }
          throw error
        }
      },
    )
  }

  /**
   * Loads a facility of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Facility identifier.
   * @returns The facility.
   * @throws NotFoundError `facility_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Facility> {
    const facility = await this.facilities.findOne(id)
    if (!facility || facility.tenant_id !== tenantId) {
      throw this.notFound()
    }
    return facility
  }

  /**
   * Checks that the organization of a new facility exists in the tenant, is not soft-deleted
   * (the repository hides soft-deleted records) and is active (HR plan F1). A missing, deleted
   * and foreign organization give the same answer, so nothing leaks across tenants.
   *
   * @param tenantId - Tenant of the caller.
   * @param organizationId - Organization identifier from the request.
   * @throws InvalidRequestError `organization_not_found` or `organization_inactive`.
   */
  private async assertOrganizationUsable(
    tenantId: string,
    organizationId: string,
  ): Promise<void> {
    const organization = await this.organizations.findOne(organizationId)
    if (!organization || organization.tenant_id !== tenantId) {
      throw new InvalidRequestError(
        'organization_not_found',
        'The organization was not found.',
      )
    }
    if (organization.status !== 'active') {
      throw new InvalidRequestError(
        'organization_inactive',
        'The organization is inactive. Activate it before adding facilities.',
      )
    }
  }

  /**
   * Checks the names of a facility (HR plan F5).
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
   * Checks the address of a facility (HR plan F6).
   *
   * @param address - Address as sent, or `null` for none.
   * @returns The cleaned address, or `null`.
   * @throws InvalidRequestError `invalid_address`.
   */
  private checkAddress(address: Address | null): Address | null {
    if (address === null) {
      return null
    }
    const cleaned = normalizeAddress(address)
    if (!cleaned) {
      throw new InvalidRequestError(
        'invalid_address',
        'The address needs a real country code and a subdivision like ID-JK, with at most 5 lines and 6 levels.',
      )
    }
    return cleaned
  }

  /**
   * Checks the holiday calendar codes: at most 10, no repeats, each in the code format. They are
   * not checked against existing calendars yet (HR plan F7).
   *
   * @param codes - Codes as sent.
   * @returns The codes.
   * @throws InvalidRequestError `invalid_holiday_calendars`.
   */
  private checkCalendars(codes: string[]): string[] {
    if (
      codes.length > MAX_HOLIDAY_CALENDARS ||
      new Set(codes).size !== codes.length ||
      codes.some((code) => !CODE_PATTERN.test(code))
    ) {
      throw new InvalidRequestError(
        'invalid_holiday_calendars',
        'Give at most 10 different calendar codes in the code format.',
      )
    }
    return [...codes]
  }

  /**
   * Checks the identifiers given by other systems (HR plan F8).
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
      'facility_exists',
      'A facility with this code already exists.',
    )
  }

  /**
   * @returns The rejection for a facility that is not in the caller's tenant.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'facility_not_found',
      'The facility was not found.',
    )
  }
}
