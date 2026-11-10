import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { type Page } from '@utility/database/interface'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { isCountryCode, isCurrencyCode } from '@utility/validation/iso-codes'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationRepository } from '@repository/interface/organization'
import { type ExternalId } from '@repository/model/common/external-id'
import { type Organization } from '@repository/model/organization'
import { REPOSITORY_FACILITY, REPOSITORY_ORGANIZATION } from '@repository/token'
import { observe } from '../observe'
import { CODE_MESSAGE, CODE_PATTERN } from './codes'
import { normalizeExternalIds } from './external-ids'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'

const NAME = 'OrganizationService'

/**
 * Filters and paging of the organization list.
 *
 * @property status - Only organizations with this status.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListOrganizationsInput {
  status?: Organization['status']
  limit?: number
  offset?: number
}

/**
 * Data of a new organization.
 *
 * @property code - Unique code inside the tenant.
 * @property legalName - Registered name.
 * @property country - ISO 3166-1 alpha-2 code.
 * @property currency - ISO 4217 code.
 * @property identifiers - Company registration and tax numbers.
 */
export interface CreateOrganizationInput {
  code: string
  legalName: string
  country: string
  currency: string
  identifiers?: ExternalId[]
}

/**
 * Changes to an organization. `code` and `country` are not here: they cannot change (HR plan O1).
 *
 * @property legalName - New registered name.
 * @property currency - New ISO 4217 code.
 * @property identifiers - New list of company identifiers, replacing the old one.
 * @property status - New status.
 * @property version - Version the caller read; the edit fails when someone changed the record since.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface UpdateOrganizationInput {
  legalName?: string
  currency?: string
  identifiers?: ExternalId[]
  status?: Organization['status']
  version?: number
  reason?: string
}

/**
 * Organizations (legal employers) of a tenant. Never deletes: an organization is set inactive.
 */
@Injectable()
export class OrganizationService {
  /**
   * @param organizations - Organization repository.
   * @param facilities - Facility repository, to refuse deactivating an organization in use.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_ORGANIZATION)
    private readonly organizations: OrganizationRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the organizations of a tenant, ordered by code. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Filters and paging.
   * @returns One page of organizations.
   */
  list(
    tenantId: string,
    input: ListOrganizationsInput,
  ): Promise<Page<Organization>> {
    return this.organizations.findAll({
      where: {
        tenant_id: { eq: tenantId },
        ...(input.status ? { status: { eq: input.status } } : {}),
      },
      orderBy: { field: 'code' },
      withPagination: true,
      limit: input.limit,
      offset: input.offset,
    })
  }

  /**
   * Returns one organization. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Organization identifier.
   * @returns The organization.
   * @throws NotFoundError `organization_not_found` when it does not exist in the tenant.
   */
  get(tenantId: string, id: string): Promise<Organization> {
    return this.load(tenantId, id)
  }

  /**
   * Creates an organization, active.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The organization.
   * @returns The created organization.
   * @throws InvalidRequestError `invalid_code`, `invalid_country`, `invalid_currency` or `invalid_identifiers`.
   * @throws ConflictError `organization_exists` when the code is taken.
   */
  create(
    tenantId: string,
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    return observe(
      this.logger,
      'organization_create',
      `${NAME}.create`,
      async () => {
        if (!CODE_PATTERN.test(input.code)) {
          throw new InvalidRequestError('invalid_code', CODE_MESSAGE)
        }
        if (!isCountryCode(input.country)) {
          throw new InvalidRequestError(
            'invalid_country',
            'The country is not an ISO 3166-1 alpha-2 code.',
          )
        }
        this.assertCurrency(input.currency)
        const identifiers = this.checkIdentifiers(input.identifiers ?? [])
        if (await this.organizations.findByCode(tenantId, input.code)) {
          throw this.exists()
        }
        try {
          return await this.organizations.create({
            tenant_id: tenantId,
            code: input.code,
            legal_name: input.legalName.trim(),
            country: input.country,
            identifiers,
            currency: input.currency,
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
   * Changes the legal name, currency, identifiers or status of an organization.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Organization identifier.
   * @param input - Fields to change.
   * @returns The updated organization.
   * @throws InvalidRequestError `empty_update`, `invalid_currency` or `invalid_identifiers`.
   * @throws NotFoundError `organization_not_found`.
   * @throws ConflictError `stale_version` when `version` is given and the record changed since;
   * `organization_in_use` when it is set inactive while it has active facilities (HR plan F9).
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    return observe(
      this.logger,
      'organization_update',
      `${NAME}.update`,
      async () => {
        const changes: Partial<
          Pick<
            Organization,
            'legal_name' | 'currency' | 'identifiers' | 'status'
          >
        > = {}
        if (input.legalName !== undefined) {
          changes.legal_name = input.legalName.trim()
        }
        if (input.currency !== undefined) {
          this.assertCurrency(input.currency)
          changes.currency = input.currency
        }
        if (input.identifiers !== undefined) {
          changes.identifiers = this.checkIdentifiers(input.identifiers)
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
        const organization = await this.load(tenantId, id)
        if (
          input.status === 'inactive' &&
          organization.status !== 'inactive' &&
          (
            await this.facilities.findActiveByOrganization(
              tenantId,
              organization.id,
            )
          ).length > 0
        ) {
          throw new ConflictError(
            'organization_in_use',
            'The organization still has active facilities. Set them inactive first.',
          )
        }
        const write = () =>
          this.organizations.update(organization.id, changes, {
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
              'The organization was changed by someone else. Reload it and try again.',
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
   * Loads an organization of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Organization identifier.
   * @returns The organization.
   * @throws NotFoundError `organization_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Organization> {
    const organization = await this.organizations.findOne(id)
    if (!organization || organization.tenant_id !== tenantId) {
      throw this.notFound()
    }
    return organization
  }

  /**
   * Checks a currency code.
   *
   * @param currency - Value to check.
   * @throws InvalidRequestError `invalid_currency`.
   */
  private assertCurrency(currency: string): void {
    if (!isCurrencyCode(currency)) {
      throw new InvalidRequestError(
        'invalid_currency',
        'The currency is not an ISO 4217 code.',
      )
    }
  }

  /**
   * Checks and cleans the company identifiers (HR plan O6).
   *
   * @param identifiers - Identifiers as sent.
   * @returns The identifiers with trimmed text.
   * @throws InvalidRequestError `invalid_identifiers`.
   */
  private checkIdentifiers(identifiers: ExternalId[]): ExternalId[] {
    const cleaned = normalizeExternalIds(identifiers)
    if (!cleaned) {
      throw new InvalidRequestError(
        'invalid_identifiers',
        'Identifiers need a system and a value each, at most 20, with no repeated system.',
      )
    }
    return cleaned
  }

  /**
   * @returns The rejection for a taken code.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'organization_exists',
      'An organization with this code already exists.',
    )
  }

  /**
   * @returns The rejection for an organization that is not in the caller's tenant.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'organization_not_found',
      'The organization was not found.',
    )
  }
}
