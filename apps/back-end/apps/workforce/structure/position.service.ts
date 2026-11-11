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
import { type PositionRepository } from '@repository/interface/position'
import { type Coding } from '@repository/model/common/coding'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Position } from '@repository/model/position'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_POSITION,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { CODE_MESSAGE, CODE_PATTERN } from './codes'
import { normalizeLocalizedTexts } from './localized-texts'

const NAME = 'PositionService'

/**
 * Most professions one position can list (HR plan P5).
 */
const MAX_PROFESSIONS = 20

/**
 * Largest budgeted headcount of a position (HR plan P7).
 */
const MAX_HEADCOUNT = 1000

/**
 * A code system of professions ends in this name, after an optional country prefix.
 */
const PROFESSION_SYSTEM = /(^|\.)profession$/

/**
 * A code system of job grades ends in this name, after an optional country prefix.
 */
const GRADE_SYSTEM = /(^|\.)job-grade$/

/**
 * Filters and paging of the position list.
 *
 * @property unitId - Unit whose positions are listed.
 * @property status - Only positions with this status.
 * @property kind - Only positions of this kind.
 * @property isHeadOfUnit - Only head positions, or only the others.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListPositionsInput {
  unitId: string
  status?: Position['status']
  kind?: Position['kind']
  isHeadOfUnit?: boolean
  limit?: number
  offset?: number
}

/**
 * Data of a new position.
 *
 * @property unitId - Unit of the position; cannot change later.
 * @property code - Code, unique inside the unit.
 * @property title - Title per language.
 * @property kind - Structural or functional.
 * @property isHeadOfUnit - Whether it is the unit's head position; default false.
 * @property allowedProfessions - Professions that may fill it; empty for any.
 * @property grade - Job grade.
 * @property budgetedHeadcount - People the position is budgeted for; default 1.
 * @property startDate - First day; defaults to today in the facility's time zone.
 */
export interface CreatePositionInput {
  unitId: string
  code: string
  title: LocalizedText[]
  kind: Position['kind']
  isHeadOfUnit?: boolean
  allowedProfessions?: Coding[]
  grade?: Coding | null
  budgetedHeadcount?: number
  startDate?: string
}

/**
 * Changes to a position. The unit, code, kind, head flag, status and period are not here (HR plan
 * P1 to P3, P9): the status and period change through `close`.
 *
 * @property title - New titles, replacing the old ones.
 * @property grade - New grade, or `null` to clear it.
 * @property allowedProfessions - New list, replacing the old one.
 * @property budgetedHeadcount - New headcount.
 * @property version - Version the caller read.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface UpdatePositionInput {
  title?: LocalizedText[]
  grade?: Coding | null
  allowedProfessions?: Coding[]
  budgetedHeadcount?: number
  version?: number
  reason?: string
}

/**
 * Data of a close.
 *
 * @property endDate - Last day; defaults to today in the facility's time zone.
 * @property version - Version the caller read.
 * @property reason - Why the position closes.
 */
export interface ClosePositionInput {
  endDate?: string
  version?: number
  reason?: string
}

/**
 * Positions (jobs) of the units of a tenant. Never deletes: a position is closed.
 */
@Injectable()
export class PositionService {
  /**
   * @param positions - Position repository.
   * @param units - Unit repository, for the unit of a position.
   * @param facilities - Facility repository, for the time zone of the unit's facility.
   * @param concepts - Code concepts, to check professions and grades.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_POSITION)
    private readonly positions: PositionRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the positions of a unit, ordered by code. A unit of another tenant or one that does not
   * exist gives an empty page (HR plan P13). Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Unit, filters and paging.
   * @returns One page of positions.
   */
  list(tenantId: string, input: ListPositionsInput): Promise<Page<Position>> {
    return this.positions.findAll({
      where: {
        tenant_id: { eq: tenantId },
        unit_id: { eq: input.unitId },
        ...(input.status ? { status: { eq: input.status } } : {}),
        ...(input.kind ? { kind: { eq: input.kind } } : {}),
        ...(input.isHeadOfUnit === undefined
          ? {}
          : { is_head_of_unit: { eq: input.isHeadOfUnit } }),
      },
      orderBy: { field: 'code' },
      withPagination: true,
      limit: input.limit,
      offset: input.offset,
    })
  }

  /**
   * Returns one position. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Position identifier.
   * @returns The position.
   * @throws NotFoundError `position_not_found` when it does not exist in the tenant.
   */
  get(tenantId: string, id: string): Promise<Position> {
    return this.load(tenantId, id)
  }

  /**
   * Creates a position, active, in an open unit.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The position.
   * @returns The created position.
   * @throws InvalidRequestError `invalid_code`, `invalid_title`, `invalid_kind`, `invalid_headcount`,
   * `head_must_be_structural`, `head_headcount`, `invalid_professions`, `invalid_grade`,
   * `unknown_code`, `code_retired`, `code_not_in_period`, `invalid_start_date`, `unit_not_found` or
   * `unit_closed`.
   * @throws ConflictError `position_exists` when the code is taken in the unit;
   * `head_position_exists` when the unit already has an active head position.
   */
  create(tenantId: string, input: CreatePositionInput): Promise<Position> {
    return observe(
      this.logger,
      'position_create',
      `${NAME}.create`,
      async () => {
        if (!CODE_PATTERN.test(input.code)) {
          throw new InvalidRequestError('invalid_code', CODE_MESSAGE)
        }
        const title = this.checkTitles(input.title)
        if (input.kind !== 'structural' && input.kind !== 'functional') {
          throw new InvalidRequestError(
            'invalid_kind',
            'The kind must be structural or functional.',
          )
        }
        const headcount = this.checkHeadcount(input.budgetedHeadcount ?? 1)
        const isHead = input.isHeadOfUnit === true
        if (isHead && input.kind !== 'structural') {
          throw new InvalidRequestError(
            'head_must_be_structural',
            'A head position must be structural.',
          )
        }
        if (isHead && headcount !== 1) {
          throw this.headHeadcount()
        }
        const professions = this.checkProfessionShape(
          input.allowedProfessions ?? [],
        )
        const grade = this.checkGradeShape(input.grade ?? null)
        if (input.startDate !== undefined && !isLocalDate(input.startDate)) {
          throw new InvalidRequestError(
            'invalid_start_date',
            'The start date must be a date like 2026-01-31.',
          )
        }
        const unit = await this.openUnit(tenantId, input.unitId)
        await this.assertCodes(tenantId, professions, grade)
        const facility = await this.facilities.findOne(unit.facility_id, {
          withSoft: true,
        })
        if (!facility) {
          throw this.unitNotFound()
        }
        if (await this.positions.findByCode(tenantId, unit.id, input.code)) {
          throw this.exists()
        }
        if (
          isHead &&
          (await this.positions.findActiveHead(tenantId, unit.id))
        ) {
          throw this.headExists()
        }
        try {
          return await this.positions.create({
            tenant_id: tenantId,
            unit_id: unit.id,
            code: input.code,
            title,
            kind: input.kind,
            is_head_of_unit: isHead,
            allowed_professions: professions,
            grade,
            budgeted_headcount: headcount,
            job_description: null,
            period: {
              start: input.startDate ?? todayInZone(facility.timezone),
              end: null,
            },
            status: 'active',
          })
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            // Two requests at once: a unique index decided. Tell which rule it was.
            throw (await this.positions.findByCode(
              tenantId,
              unit.id,
              input.code,
            ))
              ? this.exists()
              : this.headExists()
          }
          throw error
        }
      },
    )
  }

  /**
   * Changes the title, grade, allowed professions or budgeted headcount of an open position.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Position identifier.
   * @param input - Fields to change.
   * @returns The updated position.
   * @throws InvalidRequestError `empty_update`, `invalid_title`, `invalid_headcount`, `head_headcount`,
   * `invalid_professions`, `invalid_grade`, `unknown_code`, `code_retired`, `code_not_in_period` or
   * `position_closed`.
   * @throws NotFoundError `position_not_found`.
   * @throws ConflictError `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdatePositionInput,
  ): Promise<Position> {
    return observe(
      this.logger,
      'position_update',
      `${NAME}.update`,
      async () => {
        const changes: Partial<
          Pick<
            Position,
            'title' | 'grade' | 'allowed_professions' | 'budgeted_headcount'
          >
        > = {}
        if (input.title !== undefined) {
          changes.title = this.checkTitles(input.title)
        }
        if (input.grade !== undefined) {
          changes.grade = this.checkGradeShape(input.grade)
        }
        if (input.allowedProfessions !== undefined) {
          changes.allowed_professions = this.checkProfessionShape(
            input.allowedProfessions,
          )
        }
        if (input.budgetedHeadcount !== undefined) {
          changes.budgeted_headcount = this.checkHeadcount(
            input.budgetedHeadcount,
          )
        }
        if (Object.keys(changes).length === 0) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const position = await this.loadOpen(tenantId, id)
        if (
          position.is_head_of_unit &&
          changes.budgeted_headcount !== undefined &&
          changes.budgeted_headcount !== 1
        ) {
          throw this.headHeadcount()
        }
        await this.assertCodes(
          tenantId,
          changes.allowed_professions ?? [],
          changes.grade ?? null,
        )
        return this.write(position.id, input.reason, () =>
          this.positions.update(position.id, changes, {
            expectedVersion: input.version,
          }),
        )
      },
    )
  }

  /**
   * Closes an open position. A closed position stays for history and is not reopened. The rule
   * that nobody may hold it arrives with assignments (HR plan P9).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Position identifier.
   * @param input - End date and optional version and reason.
   * @returns The closed position.
   * @throws InvalidRequestError `position_closed` or `invalid_end_date`.
   * @throws NotFoundError `position_not_found`.
   * @throws ConflictError `stale_version`.
   */
  close(
    tenantId: string,
    id: string,
    input: ClosePositionInput,
  ): Promise<Position> {
    return observe(this.logger, 'position_close', `${NAME}.close`, async () => {
      if (input.endDate !== undefined && !isLocalDate(input.endDate)) {
        throw this.invalidEnd()
      }
      const position = await this.loadOpen(tenantId, id)
      const unit = await this.units.findOne(position.unit_id, {
        withSoft: true,
      })
      const facility = unit
        ? await this.facilities.findOne(unit.facility_id, { withSoft: true })
        : null
      if (!facility) {
        throw this.notFound()
      }
      const endDate = input.endDate ?? todayInZone(facility.timezone)
      const start = position.period?.start
      if (start !== undefined && compareLocalDates(endDate, start) < 0) {
        throw this.invalidEnd()
      }
      return this.write(position.id, input.reason, () =>
        this.positions.update(
          position.id,
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
   * @param id - Position identifier.
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private async write(
    id: string,
    reason: string | undefined,
    write: () => Promise<Position>,
  ): Promise<Position> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new ConflictError(
          'stale_version',
          'The position was changed by someone else. Reload it and try again.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * Loads a position of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Position identifier.
   * @returns The position.
   * @throws NotFoundError `position_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Position> {
    const position = await this.positions.findOne(id)
    if (!position || position.tenant_id !== tenantId) {
      throw this.notFound()
    }
    return position
  }

  /**
   * Loads a position that can still be changed.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Position identifier.
   * @returns The open position.
   * @throws NotFoundError `position_not_found`.
   * @throws InvalidRequestError `position_closed`.
   */
  private async loadOpen(tenantId: string, id: string): Promise<Position> {
    const position = await this.load(tenantId, id)
    if (position.status === 'closed') {
      throw new InvalidRequestError(
        'position_closed',
        'The position is closed and cannot be changed.',
      )
    }
    return position
  }

  /**
   * Checks the unit of a new position: it exists in the tenant and is open (HR plan P1). A missing,
   * deleted and foreign unit give the same answer.
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - Unit identifier from the request.
   * @returns The unit.
   * @throws InvalidRequestError `unit_not_found` or `unit_closed`.
   */
  private async openUnit(
    tenantId: string,
    unitId: string,
  ): Promise<OrganizationUnit> {
    const unit = await this.units.findOne(unitId)
    if (!unit || unit.tenant_id !== tenantId) {
      throw this.unitNotFound()
    }
    if (unit.status === 'closed') {
      throw new InvalidRequestError(
        'unit_closed',
        'The unit is closed and cannot receive positions.',
      )
    }
    return unit
  }

  /**
   * Checks every profession and the grade against the active code concepts (HR plan P5, P6).
   *
   * @param tenantId - Tenant of the caller.
   * @param professions - Professions to check.
   * @param grade - Grade to check, or `null`.
   * @throws InvalidRequestError `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async assertCodes(
    tenantId: string,
    professions: Coding[],
    grade: Coding | null,
  ): Promise<void> {
    for (const profession of professions) {
      await this.concepts.assertActive(tenantId, profession)
    }
    if (grade) {
      await this.concepts.assertActive(tenantId, grade)
    }
  }

  /**
   * Checks the shape of the professions: at most 20, no repeats, each from a profession system.
   *
   * @param professions - Professions as sent.
   * @returns The cleaned professions.
   * @throws InvalidRequestError `invalid_professions`.
   */
  private checkProfessionShape(professions: Coding[]): Coding[] {
    const keys = professions.map(({ system, code }) => `${system}|${code}`)
    if (
      professions.length > MAX_PROFESSIONS ||
      new Set(keys).size !== keys.length ||
      professions.some(({ system }) => !PROFESSION_SYSTEM.test(system))
    ) {
      throw new InvalidRequestError(
        'invalid_professions',
        'Give at most 20 different professions, each from a profession code system, for example id.profession.',
      )
    }
    return professions.map(({ system, code }) => ({ system, code }))
  }

  /**
   * Checks that a grade comes from a job-grade system.
   *
   * @param grade - Grade as sent, or `null`.
   * @returns The cleaned grade, or `null`.
   * @throws InvalidRequestError `invalid_grade`.
   */
  private checkGradeShape(grade: Coding | null): Coding | null {
    if (grade === null) {
      return null
    }
    if (!GRADE_SYSTEM.test(grade.system)) {
      throw new InvalidRequestError(
        'invalid_grade',
        'The grade must come from a job-grade code system.',
      )
    }
    return { system: grade.system, code: grade.code }
  }

  /**
   * Checks a headcount: a whole number from 1 to 1,000.
   *
   * @param headcount - Headcount as sent.
   * @returns The headcount.
   * @throws InvalidRequestError `invalid_headcount`.
   */
  private checkHeadcount(headcount: number): number {
    if (
      !Number.isInteger(headcount) ||
      headcount < 1 ||
      headcount > MAX_HEADCOUNT
    ) {
      throw new InvalidRequestError(
        'invalid_headcount',
        'The budgeted headcount must be a whole number from 1 to 1,000.',
      )
    }
    return headcount
  }

  /**
   * Checks the titles of a position.
   *
   * @param titles - Titles as sent.
   * @returns The cleaned titles.
   * @throws InvalidRequestError `invalid_title`.
   */
  private checkTitles(titles: LocalizedText[]): LocalizedText[] {
    const cleaned = normalizeLocalizedTexts(titles, {
      maxItems: 10,
      maxLength: 200,
    })
    if (!cleaned) {
      throw new InvalidRequestError(
        'invalid_title',
        'Give 1 to 10 titles, each with a language tag and text up to 200 characters, one per language.',
      )
    }
    return cleaned
  }

  /**
   * @returns The rejection for a taken code.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'position_exists',
      'A position with this code already exists in the unit.',
    )
  }

  /**
   * @returns The rejection for a second head position.
   */
  private headExists(): ConflictError {
    return new ConflictError(
      'head_position_exists',
      'The unit already has an active head position. Close it first.',
    )
  }

  /**
   * @returns The rejection for a head position with a headcount other than 1.
   */
  private headHeadcount(): InvalidRequestError {
    return new InvalidRequestError(
      'head_headcount',
      'A head position has a headcount of 1.',
    )
  }

  /**
   * @returns The rejection for a position that is not in the caller's tenant.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'position_not_found',
      'The position was not found.',
    )
  }

  /**
   * @returns The rejection for a unit that is missing or not in the caller's tenant.
   */
  private unitNotFound(): InvalidRequestError {
    return new InvalidRequestError('unit_not_found', 'The unit was not found.')
  }

  /**
   * @returns The rejection for a bad end date.
   */
  private invalidEnd(): InvalidRequestError {
    return new InvalidRequestError(
      'invalid_end_date',
      'The end date must be a date like 2026-01-31, not before the start of the position.',
    )
  }
}
