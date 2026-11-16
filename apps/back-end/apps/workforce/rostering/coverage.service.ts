import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { todayInZone, todayUtc } from '@utility/validation/local-date'
import {
  type CoverageQuery,
  type CoverageRequirementRepository,
} from '@repository/interface/coverage-requirement'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type ShiftDefinitionRepository } from '@repository/interface/shift-definition'
import { type Coding } from '@repository/model/common/coding'
import { type DatePeriod } from '@repository/model/common/calendar'
import {
  type CoverageMatch,
  type CoverageRequirement,
  type DayPattern,
} from '@repository/model/coverage-requirement'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import {
  REPOSITORY_COVERAGE_REQUIREMENT,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_SHIFT_DEFINITION,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  COVERAGE_LIMITS,
  hasStarted,
  isCoveragePeriod,
  isDayPattern,
  isMinCount,
  MATCH_SYSTEMS,
  periodsOverlap,
  sameMatch,
} from './coverage-rules'

const NAME = 'CoverageService'

/**
 * Which staff count toward a requirement, as sent. An unset or `null` criterion matches anyone.
 *
 * @property workforceCategory - Required category.
 * @property profession - Required profession.
 * @property specialty - Required specialty.
 * @property minClinicalLevel - Lowest career level that counts.
 */
export interface CoverageMatchInput {
  workforceCategory?: Coding | null
  profession?: Coding | null
  specialty?: Coding | null
  minClinicalLevel?: Coding | null
}

/**
 * Data of a new requirement.
 *
 * @property unitId - The unit.
 * @property shiftId - The shift.
 * @property dayPattern - Days it applies to.
 * @property match - Which staff count.
 * @property minCount - Minimum number of matching staff.
 * @property teamLeaderRequired - One counted person must be team leader.
 * @property period - When it applies; an empty end means open-ended.
 * @property reason - Why, kept in the change history.
 */
export interface CreateCoverageInput {
  unitId: string
  shiftId: string
  dayPattern: DayPattern
  match?: CoverageMatchInput
  minCount: number
  teamLeaderRequired?: boolean
  period: { start: string; end?: string | null }
  reason?: string
}

/**
 * Fields an edit can change. A requirement that has started can change only `periodEnd`.
 *
 * @property dayPattern - New day pattern.
 * @property match - New criteria, replacing the old ones as a whole.
 * @property minCount - New minimum count.
 * @property teamLeaderRequired - New team leader flag.
 * @property periodEnd - New last day, or `null` for open-ended.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface UpdateCoverageInput {
  dayPattern?: DayPattern
  match?: CoverageMatchInput
  minCount?: number
  teamLeaderRequired?: boolean
  periodEnd?: string | null
  version?: number
  reason?: string
}

/**
 * Data of a retirement.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface RetireCoverageInput {
  version?: number
  reason?: string
}

/**
 * The coverage requirements of a tenant (HR plan 5.3): list, add, edit and retire. Never deletes;
 * the unit and the shift are fixed after creation, and a requirement that has started can only be
 * ended, not rewritten.
 */
@Injectable()
export class CoverageService {
  /**
   * @param requirements - Coverage requirement repository.
   * @param units - Organization unit repository.
   * @param shifts - Shift definition repository.
   * @param facilities - Facility repository, for the time zone of "today".
   * @param concepts - Code concepts, for the staff criteria.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_COVERAGE_REQUIREMENT)
    private readonly requirements: CoverageRequirementRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_SHIFT_DEFINITION)
    private readonly shifts: ShiftDefinitionRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists requirements ordered by unit, shift and period start. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging.
   * @returns The requirements.
   */
  list(
    tenantId: string,
    query: CoverageQuery,
  ): Promise<CoverageRequirement[]> {
    return this.requirements.findByFilter(tenantId, query)
  }

  /**
   * Adds a requirement (HR plan 5.3 CR1 to CR7, CR9).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The requirement.
   * @returns The created requirement.
   * @throws InvalidRequestError `invalid_day_pattern`, `invalid_min_count`, `invalid_period`,
   * `unit_not_found`, `unit_closed`, `shift_not_found`, `shift_retired`, `shift_outside_facility`,
   * `shift_unit_not_allowed`, `shift_not_countable` or the codes of `checkMatch`.
   * @throws ConflictError `requirement_exists`.
   */
  create(
    tenantId: string,
    input: CreateCoverageInput,
  ): Promise<CoverageRequirement> {
    return observe(
      this.logger,
      'coverage_create',
      `${NAME}.create`,
      async () => {
        this.checkDayPattern(input.dayPattern)
        this.checkCount(input.minCount)
        const period: DatePeriod = {
          start: input.period?.start,
          end: input.period?.end ?? null,
        }
        this.checkPeriod(period)
        await this.checkUnitAndShift(tenantId, input.unitId, input.shiftId)
        const match = await this.checkMatch(tenantId, input.match ?? {})
        await this.assertNoDuplicate(
          tenantId,
          input.unitId,
          input.shiftId,
          { dayPattern: input.dayPattern, match, period },
          undefined,
        )
        const write = (): Promise<CoverageRequirement> =>
          this.requirements.create({
            tenant_id: tenantId,
            unit_id: input.unitId,
            shift_definition_id: input.shiftId,
            day_pattern: input.dayPattern,
            match,
            min_count: input.minCount,
            team_leader_required: input.teamLeaderRequired ?? false,
            period,
            status: 'active',
          })
        return input.reason ? withChangeReason(input.reason, write) : write()
      },
    )
  }

  /**
   * Edits an active requirement. One that has started can change only its last day (HR plan 5.3
   * CR8); a changed rule is a new requirement that starts later.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Requirement identifier.
   * @param input - Fields to change, optional version and reason.
   * @returns The updated requirement.
   * @throws NotFoundError `requirement_not_found`.
   * @throws InvalidRequestError `requirement_retired`, `empty_update`, `requirement_in_force` and
   * the codes of `create` for the fields that are sent.
   * @throws ConflictError `requirement_exists` or `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateCoverageInput,
  ): Promise<CoverageRequirement> {
    return observe(
      this.logger,
      'coverage_update',
      `${NAME}.update`,
      async () => {
        const requirement = await this.loadActive(tenantId, id)
        const meaning = [
          input.dayPattern,
          input.match,
          input.minCount,
          input.teamLeaderRequired,
        ]
        if (
          meaning.every((value) => value === undefined) &&
          input.periodEnd === undefined
        ) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        if (
          meaning.some((value) => value !== undefined) &&
          hasStarted(requirement.period, await this.today(requirement))
        ) {
          throw new InvalidRequestError(
            'requirement_in_force',
            'A requirement that has started can only be ended. End it with the last day and add a new one.',
          )
        }
        const changes: Partial<
          Pick<
            CoverageRequirement,
            | 'day_pattern'
            | 'match'
            | 'min_count'
            | 'team_leader_required'
            | 'period'
          >
        > = {}
        if (input.dayPattern !== undefined) {
          this.checkDayPattern(input.dayPattern)
          changes.day_pattern = input.dayPattern
        }
        if (input.minCount !== undefined) {
          this.checkCount(input.minCount)
          changes.min_count = input.minCount
        }
        if (input.teamLeaderRequired !== undefined) {
          changes.team_leader_required = input.teamLeaderRequired
        }
        if (input.periodEnd !== undefined) {
          const period = { start: requirement.period.start, end: input.periodEnd }
          this.checkPeriod(period)
          changes.period = period
        }
        if (input.match !== undefined) {
          changes.match = await this.checkMatch(tenantId, input.match)
        }
        await this.assertNoDuplicate(
          tenantId,
          requirement.unit_id,
          requirement.shift_definition_id,
          {
            dayPattern: changes.day_pattern ?? requirement.day_pattern,
            match: changes.match ?? requirement.match,
            period: changes.period ?? requirement.period,
          },
          requirement.id,
        )
        this.assertVersion(requirement, input.version)
        return this.write(input.reason, () =>
          this.requirements.update(requirement.id, changes, {
            expectedVersion: input.version,
          }),
        )
      },
    )
  }

  /**
   * Stops checking a requirement. Final: there is no way back (HR plan 5.3 CR10).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Requirement identifier.
   * @param input - Optional version and reason.
   * @returns The retired requirement.
   * @throws NotFoundError `requirement_not_found`.
   * @throws InvalidRequestError `requirement_retired`.
   * @throws ConflictError `stale_version`.
   */
  retire(
    tenantId: string,
    id: string,
    input: RetireCoverageInput,
  ): Promise<CoverageRequirement> {
    return observe(
      this.logger,
      'coverage_retire',
      `${NAME}.retire`,
      async () => {
        const requirement = await this.loadActive(tenantId, id)
        this.assertVersion(requirement, input.version)
        return this.write(input.reason, () =>
          this.requirements.update(
            requirement.id,
            { status: 'retired' },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Checks the day pattern.
   *
   * @param value - The day pattern as sent.
   * @throws InvalidRequestError `invalid_day_pattern`.
   */
  private checkDayPattern(value: unknown): void {
    if (!isDayPattern(value)) {
      throw new InvalidRequestError(
        'invalid_day_pattern',
        'The day pattern must be all, weekdays or weekends_holidays.',
      )
    }
  }

  /**
   * Checks the minimum count.
   *
   * @param value - The count as sent.
   * @throws InvalidRequestError `invalid_min_count`.
   */
  private checkCount(value: unknown): void {
    if (!isMinCount(value)) {
      throw new InvalidRequestError(
        'invalid_min_count',
        `The minimum count must be a whole number from ${COVERAGE_LIMITS.minCount} to ${COVERAGE_LIMITS.maxCount}.`,
      )
    }
  }

  /**
   * Checks the period.
   *
   * @param period - The period as it will be stored.
   * @throws InvalidRequestError `invalid_period`.
   */
  private checkPeriod(period: DatePeriod): void {
    if (!isCoveragePeriod(period)) {
      throw new InvalidRequestError(
        'invalid_period',
        'The period needs a real start date from 2000-01-01 and an end that is empty or not before the start.',
      )
    }
  }

  /**
   * Checks the unit and the shift of a new requirement (HR plan 5.3 CR1, CR2).
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - The unit as sent.
   * @param shiftId - The shift as sent.
   * @throws InvalidRequestError `unit_not_found`, `unit_closed`, `shift_not_found`,
   * `shift_retired`, `shift_outside_facility`, `shift_unit_not_allowed` or `shift_not_countable`.
   */
  private async checkUnitAndShift(
    tenantId: string,
    unitId: string,
    shiftId: string,
  ): Promise<void> {
    const unit = await this.units.findOne(unitId)
    if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
      throw new InvalidRequestError('unit_not_found', 'The unit was not found.')
    }
    if (unit.status !== 'active') {
      throw new InvalidRequestError('unit_closed', 'The unit is closed.')
    }
    const shift = await this.shifts.findOne(shiftId)
    if (!shift || shift.tenant_id !== tenantId || shift.deleted_at) {
      throw new InvalidRequestError(
        'shift_not_found',
        'The shift was not found.',
      )
    }
    if (shift.status !== 'active') {
      throw new InvalidRequestError('shift_retired', 'The shift is retired.')
    }
    if (shift.facility_id !== unit.facility_id) {
      throw new InvalidRequestError(
        'shift_outside_facility',
        'The shift belongs to another facility than the unit.',
      )
    }
    if (shift.unit_ids.length > 0 && !shift.unit_ids.includes(unit.id)) {
      throw new InvalidRequestError(
        'shift_unit_not_allowed',
        'The unit may not use this shift.',
      )
    }
    if (shift.type === 'off') {
      throw new InvalidRequestError(
        'shift_not_countable',
        'A day off has no staff to count.',
      )
    }
  }

  /**
   * Checks the staff criteria and cleans them: each is empty or an active code of its system
   * (HR plan 5.3 CR4).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The criteria as sent.
   * @returns The criteria as they will be stored, unset ones `null`.
   * @throws InvalidRequestError `invalid_category`, `invalid_profession`, `invalid_specialty` or
   * `invalid_clinical_level`, and the rejection of an inactive or unknown code.
   */
  private async checkMatch(
    tenantId: string,
    input: CoverageMatchInput,
  ): Promise<CoverageMatch> {
    const check = async (
      coding: Coding | null | undefined,
      pattern: RegExp,
      code: string,
    ): Promise<Coding | null> => {
      if (coding === undefined || coding === null) {
        return null
      }
      if (!pattern.test(coding.system)) {
        throw new InvalidRequestError(
          code,
          'A criterion comes from the wrong code system.',
        )
      }
      await this.concepts.assertActive(tenantId, coding)
      return { system: coding.system, code: coding.code }
    }
    return {
      workforce_category: await check(
        input.workforceCategory,
        MATCH_SYSTEMS.workforceCategory,
        'invalid_category',
      ),
      profession: await check(
        input.profession,
        MATCH_SYSTEMS.profession,
        'invalid_profession',
      ),
      specialty: await check(
        input.specialty,
        MATCH_SYSTEMS.specialty,
        'invalid_specialty',
      ),
      min_clinical_level: await check(
        input.minClinicalLevel,
        MATCH_SYSTEMS.minClinicalLevel,
        'invalid_clinical_level',
      ),
    }
  }

  /**
   * Refuses a requirement identical to an active one of the same unit and shift with an
   * overlapping period (HR plan 5.3 CR9).
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - The unit.
   * @param shiftId - The shift.
   * @param candidate - The day pattern, criteria and period it will have.
   * @param ignoreId - A requirement to leave out, the one being edited.
   * @throws ConflictError `requirement_exists`.
   */
  private async assertNoDuplicate(
    tenantId: string,
    unitId: string,
    shiftId: string,
    candidate: { dayPattern: DayPattern; match: CoverageMatch; period: DatePeriod },
    ignoreId: string | undefined,
  ): Promise<void> {
    const active = await this.requirements.findActiveByUnitAndShift(
      tenantId,
      unitId,
      shiftId,
    )
    const same = active.some(
      (other) =>
        other.id !== ignoreId &&
        other.day_pattern === candidate.dayPattern &&
        sameMatch(other.match, candidate.match) &&
        periodsOverlap(other.period, candidate.period),
    )
    if (same) {
      throw new ConflictError(
        'requirement_exists',
        'An active requirement for this unit and shift with the same days and criteria overlaps this period.',
      )
    }
  }

  /**
   * Returns today's local date in the zone of the requirement's facility; UTC when the unit or the
   * facility cannot be read.
   *
   * @param requirement - The requirement.
   * @returns Today as `YYYY-MM-DD`.
   */
  private async today(requirement: CoverageRequirement): Promise<string> {
    const unit: OrganizationUnit | null = await this.units.findOne(
      requirement.unit_id,
    )
    const facility = unit ? await this.facilities.findOne(unit.facility_id) : null
    return facility ? todayInZone(facility.timezone) : todayUtc()
  }

  /**
   * Loads a requirement of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Requirement identifier.
   * @returns The requirement.
   * @throws NotFoundError `requirement_not_found`.
   */
  private async load(
    tenantId: string,
    id: string,
  ): Promise<CoverageRequirement> {
    const requirement = await this.requirements.findOne(id)
    if (
      !requirement ||
      requirement.tenant_id !== tenantId ||
      requirement.deleted_at
    ) {
      throw this.notFound()
    }
    return requirement
  }

  /**
   * Loads a requirement that is still active.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Requirement identifier.
   * @returns The requirement.
   * @throws NotFoundError `requirement_not_found`.
   * @throws InvalidRequestError `requirement_retired`.
   */
  private async loadActive(
    tenantId: string,
    id: string,
  ): Promise<CoverageRequirement> {
    const requirement = await this.load(tenantId, id)
    if (requirement.status === 'retired') {
      throw new InvalidRequestError(
        'requirement_retired',
        'The requirement is retired and cannot be changed.',
      )
    }
    return requirement
  }

  /**
   * Refuses a stale version before any write.
   *
   * @param requirement - The requirement as read.
   * @param version - Version the caller read.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(
    requirement: CoverageRequirement,
    version: number | undefined,
  ): void {
    if (version !== undefined && version !== requirement.version) {
      throw this.stale()
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
    write: () => Promise<CoverageRequirement>,
  ): Promise<CoverageRequirement> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw this.stale()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * @returns The not-found error for a requirement.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'requirement_not_found',
      'The requirement was not found.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The requirement was changed by someone else. Reload it and try again.',
    )
  }
}
