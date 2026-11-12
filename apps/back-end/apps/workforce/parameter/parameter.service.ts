import { Inject, Injectable } from '@nestjs/common'
import { RepositoryConflictError } from '@utility/database/error'
import { type Page } from '@utility/database/interface'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import {
  compareLocalDates,
  isLocalDate,
  todayInZone,
  todayUtc,
} from '@utility/validation/local-date'
import { type FacilityRepository } from '@repository/interface/facility'
import { type HrParameterRepository } from '@repository/interface/hr-parameter'
import { type OrganizationRepository } from '@repository/interface/organization'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import {
  type HrParameter,
  type HrParameterScope,
} from '@repository/model/hr-parameter'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_HR_PARAMETER,
  REPOSITORY_ORGANIZATION,
  REPOSITORY_ORGANIZATION_UNIT,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import { ConflictError, InvalidRequestError } from '../workforce.error'
import {
  findParameter,
  PARAMETER_CATALOG,
  type ParameterDefinition,
} from './catalog'
import { checkValue, type ProfessionPoints } from './value-types'

const NAME = 'ParameterService'

/**
 * Longest note on a parameter value (HR plan R10).
 */
const MAX_NOTES = 500

/**
 * A code system of professions ends in this name, after an optional country prefix.
 */
const PROFESSION_SYSTEM = /(^|\.)profession$/

/**
 * Filters and paging of the parameter list.
 *
 * @property key - Only values of this parameter.
 * @property scopeKind - Only values set at this level.
 * @property scopeId - Only values set for this organization, facility or unit; needs `scopeKind`.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListParametersInput {
  key?: string
  scopeKind?: HrParameterScope['kind']
  scopeId?: string
  limit?: number
  offset?: number
}

/**
 * A value to set.
 *
 * @property key - Parameter key from the catalog.
 * @property scope - Level the value applies to; `id` is `null` or missing for the tenant.
 * @property value - The value, checked against the type of the key.
 * @property effectiveFrom - First day the value applies.
 * @property notes - Legal basis, for example a PKB article.
 * @property reason - Why the value is set, kept in the change history.
 */
export interface SetParameterInput {
  key: string
  scope: { kind: HrParameterScope['kind']; id?: string | null }
  value: unknown
  effectiveFrom: string
  notes?: string
  reason?: string
}

/**
 * Where and when to look a parameter up. At most one place is named: the most specific one.
 *
 * @property key - Parameter key from the catalog.
 * @property organizationId - Organization to read the value for.
 * @property facilityId - Facility to read the value for.
 * @property unitId - Unit to read the value for.
 * @property date - Day the value must be in force; defaults to today.
 */
export interface EffectiveParameterInput {
  key: string
  organizationId?: string
  facilityId?: string
  unitId?: string
  date?: string
}

/**
 * The value in force and where it comes from.
 *
 * @property key - Parameter key.
 * @property value - Value in force.
 * @property source - Level the value was set at, or `default` for the catalog default.
 * @property scope - Scope of the value, or `null` for the default.
 * @property effective_from - First day the value applies, or `null` for the default.
 * @property parameter_id - Identifier of the stored value, or `null` for the default.
 * @property date - Day the lookup was made for.
 */
export interface EffectiveParameter {
  key: string
  value: unknown
  source: HrParameterScope['kind'] | 'default'
  scope: HrParameterScope | null
  effective_from: string | null
  parameter_id: string | null
  date: string
}

/**
 * Where a lookup starts: the levels to read, most specific first, and the facility time zone when
 * the place has one.
 */
interface Place {
  levels: HrParameterScope[]
  timeZone: string | null
}

/**
 * Dated HR parameters of a tenant, set at the tenant, an organization, a facility or a unit. A
 * value is never edited or deleted; a new value from a later date replaces it.
 */
@Injectable()
export class ParameterService {
  /**
   * @param parameters - HR parameter repository.
   * @param organizations - Organization repository, to check and expand scopes.
   * @param facilities - Facility repository, to check and expand scopes.
   * @param units - Unit repository, to check and expand scopes.
   * @param concepts - Code concepts, to check the professions of a points list.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_HR_PARAMETER)
    private readonly parameters: HrParameterRepository,
    @Inject(REPOSITORY_ORGANIZATION)
    private readonly organizations: OrganizationRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the parameters of the catalog. Writes no log entry (a read).
   *
   * @returns Every key with its type, default, allowed scopes and description.
   */
  catalog(): readonly ParameterDefinition[] {
    return PARAMETER_CATALOG
  }

  /**
   * Lists the values that were set, ordered by key; with a key filter, newest date first. A scope
   * of another tenant gives an empty page (HR plan R11). Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Filters and paging.
   * @returns One page of values.
   * @throws InvalidRequestError `scope_kind_required` when `scopeId` has no `scopeKind`.
   */
  async list(
    tenantId: string,
    input: ListParametersInput,
  ): Promise<Page<HrParameter>> {
    if (input.scopeId !== undefined && input.scopeKind === undefined) {
      throw new InvalidRequestError(
        'scope_kind_required',
        'Give the scope kind together with the scope id.',
      )
    }
    return this.parameters.findPage(tenantId, input)
  }

  /**
   * Returns the value in force for a key, place and date. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Key, place and date.
   * @returns The value and where it comes from.
   * @throws InvalidRequestError `unknown_parameter`, `invalid_place`, `invalid_date` or
   * `scope_not_found`.
   */
  effective(
    tenantId: string,
    input: EffectiveParameterInput,
  ): Promise<EffectiveParameter> {
    return this.resolve(tenantId, input)
  }

  /**
   * Returns the value in force for a key, place and date. Later HR rules (rostering, licences) call
   * this instead of reading the collection themselves.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Key, place and date.
   * @returns The value and where it comes from.
   * @throws InvalidRequestError `unknown_parameter`, `invalid_place`, `invalid_date` or
   * `scope_not_found`.
   */
  async resolve(
    tenantId: string,
    input: EffectiveParameterInput,
  ): Promise<EffectiveParameter> {
    const definition = this.definition(input.key)
    const places = [
      input.organizationId,
      input.facilityId,
      input.unitId,
    ].filter((id) => id !== undefined)
    if (places.length > 1) {
      throw new InvalidRequestError(
        'invalid_place',
        'Name at most one of organizationId, facilityId and unitId.',
      )
    }
    if (input.date !== undefined && !isLocalDate(input.date)) {
      throw new InvalidRequestError(
        'invalid_date',
        'The date must be a date like 2026-01-31.',
      )
    }
    const place = await this.place(tenantId, input)
    const date =
      input.date ?? (place.timeZone ? todayInZone(place.timeZone) : todayUtc())
    const rows = await this.parameters.findByKey(tenantId, definition.key)
    for (const level of place.levels) {
      if (!definition.scopes.includes(level.kind)) {
        continue
      }
      const inForce = rows
        .filter(
          (row) =>
            row.scope.kind === level.kind &&
            row.scope.id === level.id &&
            compareLocalDates(row.effective_from, date) <= 0,
        )
        .sort((left, right) =>
          right.effective_from.localeCompare(left.effective_from),
        )[0]
      if (inForce) {
        return {
          key: definition.key,
          value: inForce.value,
          source: inForce.scope.kind,
          scope: inForce.scope,
          effective_from: inForce.effective_from,
          parameter_id: inForce.id,
          date,
        }
      }
    }
    return {
      key: definition.key,
      value: definition.default,
      source: 'default',
      scope: null,
      effective_from: null,
      parameter_id: null,
      date,
    }
  }

  /**
   * Sets a value from a date. Never changes an earlier value.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The value.
   * @returns The stored value.
   * @throws InvalidRequestError `unknown_parameter`, `scope_not_allowed`, `scope_not_available`,
   * `invalid_scope`, `scope_not_found`, `invalid_value`, `unknown_code`, `code_retired`,
   * `code_not_in_period`, `invalid_effective_from`, `effective_from_in_past` or `invalid_notes`.
   * @throws ConflictError `parameter_exists` when the key, scope and date already have a value.
   */
  set(tenantId: string, input: SetParameterInput): Promise<HrParameter> {
    return observe(this.logger, 'parameter_set', `${NAME}.set`, async () => {
      const definition = this.definition(input.key)
      if (!definition.scopes.includes(input.scope.kind)) {
        throw new InvalidRequestError(
          'scope_not_allowed',
          'This parameter cannot be set at that level.',
        )
      }
      if (input.scope.kind === 'committee') {
        throw new InvalidRequestError(
          'scope_not_available',
          'Committee values cannot be set until committees exist.',
        )
      }
      const scope = this.scopeOf(input.scope)
      if (!isLocalDate(input.effectiveFrom)) {
        throw new InvalidRequestError(
          'invalid_effective_from',
          'The start date must be a date like 2026-01-31.',
        )
      }
      if (compareLocalDates(input.effectiveFrom, this.earliestDate()) < 0) {
        throw new InvalidRequestError(
          'effective_from_in_past',
          'The start date cannot be before yesterday.',
        )
      }
      const notes = this.checkNotes(input.notes)
      const value = checkValue(definition.type, input.value)
      if (value === undefined) {
        throw new InvalidRequestError(
          'invalid_value',
          'The value does not fit the type or limits of this parameter.',
        )
      }
      await this.assertProfessions(tenantId, definition, value)
      await this.assertScopeExists(tenantId, scope)
      if (
        await this.parameters.findOneAt(
          tenantId,
          definition.key,
          scope,
          input.effectiveFrom,
        )
      ) {
        throw this.exists()
      }
      const write = () =>
        this.parameters.create({
          tenant_id: tenantId,
          key: definition.key,
          scope,
          value,
          effective_from: input.effectiveFrom,
          notes,
        })
      try {
        return await (input.reason
          ? withChangeReason(input.reason, write)
          : write())
      } catch (error: unknown) {
        // Two requests with the same key, scope and date at once: the unique index decides.
        throw error instanceof RepositoryConflictError ? this.exists() : error
      }
    })
  }

  /**
   * Finds a key in the catalog.
   *
   * @param key - Parameter key.
   * @returns The definition.
   * @throws InvalidRequestError `unknown_parameter`.
   */
  private definition(key: string): ParameterDefinition {
    const definition = findParameter(key)
    if (!definition) {
      throw new InvalidRequestError(
        'unknown_parameter',
        'This parameter is not in the catalog.',
      )
    }
    return definition
  }

  /**
   * Checks the shape of a scope: the tenant has no id, every other level has one.
   *
   * @param scope - Scope as sent.
   * @returns The scope with `id` as text or `null`.
   * @throws InvalidRequestError `invalid_scope`.
   */
  private scopeOf(scope: SetParameterInput['scope']): HrParameterScope {
    if (scope.kind === 'tenant') {
      if (scope.id !== undefined && scope.id !== null) {
        throw new InvalidRequestError(
          'invalid_scope',
          'A tenant value has no scope id.',
        )
      }
      return { kind: 'tenant', id: null }
    }
    if (typeof scope.id !== 'string' || scope.id === '') {
      throw new InvalidRequestError(
        'invalid_scope',
        'Give the identifier of the organization, facility or unit.',
      )
    }
    return { kind: scope.kind, id: scope.id }
  }

  /**
   * Checks that the organization, facility or unit of a scope exists in the tenant and is not
   * soft-deleted (HR plan R3). A missing and a foreign record give the same answer.
   *
   * @param tenantId - Tenant of the caller.
   * @param scope - Scope to check.
   * @throws InvalidRequestError `scope_not_found`.
   */
  private async assertScopeExists(
    tenantId: string,
    scope: HrParameterScope,
  ): Promise<void> {
    if (scope.id === null) {
      return
    }
    const record =
      scope.kind === 'organization'
        ? await this.organizations.findOne(scope.id)
        : scope.kind === 'facility'
          ? await this.facilities.findOne(scope.id)
          : await this.units.findOne(scope.id)
    if (!record || record.tenant_id !== tenantId) {
      throw this.scopeNotFound()
    }
  }

  /**
   * Checks the professions of a points list against the active code concepts.
   *
   * @param tenantId - Tenant of the caller.
   * @param definition - The parameter.
   * @param value - Cleaned value.
   * @throws InvalidRequestError `invalid_value`, `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async assertProfessions(
    tenantId: string,
    definition: ParameterDefinition,
    value: unknown,
  ): Promise<void> {
    if (definition.type.kind !== 'profession_points') {
      return
    }
    for (const { profession } of value as ProfessionPoints[]) {
      if (!PROFESSION_SYSTEM.test(profession.system)) {
        throw new InvalidRequestError(
          'invalid_value',
          'Each profession must come from a profession code system, for example id.profession.',
        )
      }
      await this.concepts.assertActive(tenantId, profession)
    }
  }

  /**
   * Expands the place of a lookup into the levels to read, most specific first.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Lookup input.
   * @returns The levels and the time zone of the place, when it has one.
   * @throws InvalidRequestError `scope_not_found`.
   */
  private async place(
    tenantId: string,
    input: EffectiveParameterInput,
  ): Promise<Place> {
    const tenant: HrParameterScope = { kind: 'tenant', id: null }
    if (input.unitId !== undefined) {
      const unit = await this.units.findOne(input.unitId)
      if (!unit || unit.tenant_id !== tenantId) {
        throw this.scopeNotFound()
      }
      const facility = await this.facilities.findOne(unit.facility_id, {
        withSoft: true,
      })
      return {
        levels: [
          { kind: 'unit', id: unit.id },
          { kind: 'facility', id: unit.facility_id },
          { kind: 'organization', id: unit.organization_id },
          tenant,
        ],
        timeZone: facility ? facility.timezone : null,
      }
    }
    if (input.facilityId !== undefined) {
      const facility = await this.facilities.findOne(input.facilityId)
      if (!facility || facility.tenant_id !== tenantId) {
        throw this.scopeNotFound()
      }
      return {
        levels: [
          { kind: 'facility', id: facility.id },
          { kind: 'organization', id: facility.organization_id },
          tenant,
        ],
        timeZone: facility.timezone,
      }
    }
    if (input.organizationId !== undefined) {
      const organization = await this.organizations.findOne(
        input.organizationId,
      )
      if (!organization || organization.tenant_id !== tenantId) {
        throw this.scopeNotFound()
      }
      return {
        levels: [{ kind: 'organization', id: organization.id }, tenant],
        timeZone: null,
      }
    }
    return { levels: [tenant], timeZone: null }
  }

  /**
   * Checks the notes of a value.
   *
   * @param notes - Notes as sent.
   * @returns The trimmed notes, or `null` when none were given.
   * @throws InvalidRequestError `invalid_notes`.
   */
  private checkNotes(notes: string | undefined): string | null {
    if (notes === undefined) {
      return null
    }
    const trimmed = typeof notes === 'string' ? notes.trim() : ''
    if (trimmed === '' || trimmed.length > MAX_NOTES) {
      throw new InvalidRequestError(
        'invalid_notes',
        'The notes must have 1 to 500 characters.',
      )
    }
    return trimmed
  }

  /**
   * The earliest start date a new value may have: yesterday in UTC, so a facility on either side of
   * UTC can still set today in its own time zone (HR plan R6).
   *
   * @returns The local date.
   */
  private earliestDate(): string {
    return todayUtc(new Date(Date.now() - 24 * 60 * 60 * 1000))
  }

  /**
   * @returns The rejection for a value that already exists for the key, scope and date.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'parameter_exists',
      'A value for this parameter, scope and date already exists. Set the right value from a later date.',
    )
  }

  /**
   * @returns The rejection for a scope that is missing or not in the caller's tenant.
   */
  private scopeNotFound(): InvalidRequestError {
    return new InvalidRequestError(
      'scope_not_found',
      'The organization, facility or unit was not found.',
    )
  }
}
