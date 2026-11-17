import { createHash } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { type ActorRef } from '@utility/history/actor'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { todayInZone } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type HrImportRepository } from '@repository/interface/hr-import'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type RosterRepository } from '@repository/interface/roster'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type ShiftDefinitionRepository } from '@repository/interface/shift-definition'
import { type Employee } from '@repository/model/employee'
import { type HrImport, type HrImportError } from '@repository/model/hr-import'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Roster } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { type ShiftDefinition } from '@repository/model/shift-definition'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_HR_IMPORT,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
  REPOSITORY_SHIFT_DEFINITION,
} from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import { EligibilityService } from '../eligibility/eligibility.service'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  assertAssignable,
  assertEligible,
  assertShiftUsable,
  firstWorkingTimeViolation,
  toWorkingShift,
} from './assignment-checks'
import { readCsvBody } from './read-csv-body'
import { isInPeriod, shiftInstants } from './roster-assignment-rules'
import { parseRosterFile, type ParsedRosterRow } from './roster-import'
import { RosterValidationService } from './roster-validation.service'
import { type WorkingShift } from './working-time'
import { readWorkingTimeLimits } from './working-time-limits'

const NAME = 'RosterImportService'

/**
 * Which column of the file a row-check code belongs to, for the error record. Codes that are about
 * the employee's schedule as a whole have no column.
 */
const COLUMNS: Record<string, string> = {
  employee_not_found: 'employee_number',
  employee_not_assignable: 'employee_number',
  not_eligible_employment: 'employee_number',
  not_eligible_str: 'employee_number',
  not_eligible_sip: 'employee_number',
  not_eligible_spk: 'employee_number',
  shift_not_found: 'shift_code',
  shift_retired: 'shift_code',
  shift_outside_facility: 'shift_code',
  shift_unit_not_allowed: 'shift_code',
  date_outside_period: 'date',
  assignment_in_past: 'date',
  assignment_exists: 'date',
}

/**
 * Data of a roster import.
 *
 * @property content - The CSV text of the request body.
 * @property apply - False or missing checks the file; true applies a file that was checked.
 * @property checkId - The `validated` import that checked this same file (needed to apply).
 * @property version - Version of the roster the caller read (applying only).
 * @property reason - Why, kept in the change history (applying only).
 */
export interface RosterImportInput {
  content: unknown
  apply?: boolean
  checkId?: string
  version?: number
  reason?: string
}

/**
 * The answer of a roster import: the import record, and what the file would leave in the roster.
 *
 * @property import - The import record, with its counts and row errors.
 * @property coverageGaps - Coverage gaps the roster would have with the file applied (not stored),
 * or `null` when the file is not valid.
 * @property restDayGaps - Runs of 7 days without a rest day the roster would have, or `null`.
 */
export interface RosterImportAnswer {
  import: HrImport
  coverageGaps: number | null
  restDayGaps: number | null
}

/**
 * A row that passed every check, with what the apply needs to write it.
 */
interface AcceptedRow {
  row: ParsedRosterRow
  employee: Employee
  shift: ShiftDefinition
  startsAt: Date | null
  endsAt: Date | null
  overtimeMinutes: number
}

/**
 * The roster CSV import (HR plan 5.6): a file is checked as a whole with every rule of HR spec
 * 8.5, and nothing is written to the roster until it is applied. A bad file changes nothing.
 */
@Injectable()
export class RosterImportService {
  /**
   * @param rosters - Roster repository.
   * @param assignments - Roster assignment repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone.
   * @param shifts - Shift definition repository.
   * @param employees - Employee repository.
   * @param imports - HR import repository.
   * @param eligibility - General clinical eligibility.
   * @param parameters - HR parameters (the import and working-time limits).
   * @param validation - Roster validation, to preview coverage and rest days.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly assignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_SHIFT_DEFINITION)
    private readonly shifts: ShiftDefinitionRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_HR_IMPORT) private readonly imports: HrImportRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(RosterValidationService)
    private readonly validation: RosterValidationService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Checks a roster file, and records the result. The roster is not changed (HR plan 5.6 IM7).
   *
   * @param tenantId - Tenant of the caller.
   * @param rosterId - Roster identifier.
   * @param input - The file and what to do with it.
   * @returns The import record and what the file would leave in the roster.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `roster_locked`, `roster_closed`, `unit_closed`, `csv_required`,
   * `empty_file`, `invalid_encoding`, `invalid_csv`, `invalid_header`, `no_rows`, `too_many_rows`
   * or `apply_not_available`.
   * @throws ForbiddenError `actor_required`.
   */
  importFile(
    tenantId: string,
    rosterId: string,
    input: RosterImportInput,
  ): Promise<RosterImportAnswer> {
    return observe(
      this.logger,
      'roster_import_check',
      `${NAME}.check`,
      async () => {
        if (input.apply === true) {
          throw new InvalidRequestError(
            'apply_not_available',
            'Applying a roster file is not available yet. Check the file first.',
          )
        }
        const roster = await this.loadRoster(tenantId, rosterId)
        this.assertDraft(roster)
        const table = readCsvBody(input.content)
        const maxRows = await this.limit(tenantId, 'IMPORT_MAX_ROWS')
        const maxErrors = await this.limit(tenantId, 'IMPORT_MAX_ERRORS')
        if (table.rows.length > maxRows) {
          throw new InvalidRequestError(
            'too_many_rows',
            `The file has more than ${maxRows} rows.`,
          )
        }
        const parsed = parseRosterFile(table)
        const actor = this.actor()
        const checked = await this.checkRows(tenantId, roster, parsed)
        const errors = [...parsed.errors, ...checked.errors].sort(
          (left, right) =>
            left.row - right.row ||
            (left.column ?? '').localeCompare(right.column ?? ''),
        )
        const invalidRows = new Set(errors.map((item) => item.row)).size
        const valid = errors.length === 0
        let coverageGaps: number | null = null
        let restDayGaps: number | null = null
        if (valid) {
          const preview = await this.validation.report(
            tenantId,
            roster,
            checked.accepted.map((item, index) =>
              this.toAssignment(tenantId, roster, item, index),
            ),
          )
          coverageGaps = preview.summary.coverageGaps
          restDayGaps = preview.violations.filter(
            (item) => item.code === 'no_rest_day',
          ).length
        }
        const sha256 = createHash('sha256')
          .update(input.content as string, 'utf8')
          .digest('hex')
        const record = await this.imports.create({
          tenant_id: tenantId,
          kind: 'roster_assignments',
          target: { roster_id: roster.id },
          file: {
            file_id: `inline:${sha256.slice(0, 16)}`,
            content_type: 'text/csv',
            sha256,
          },
          status: valid ? 'validated' : 'invalid',
          counts: {
            rows: parsed.rows,
            valid: parsed.rows - invalidRows,
            invalid: invalidRows,
            created: valid ? checked.accepted.length : 0,
            updated: 0,
            skipped: 0,
          },
          errors: errors.slice(0, maxErrors),
          uploaded: { by: actor, at: new Date() },
          applied: null,
          failure: null,
        })
        return { import: record, coverageGaps, restDayGaps }
      },
      'log',
      (answer) => ({
        status: answer.import.status,
        rows: answer.import.counts.rows,
        invalid: answer.import.counts.invalid,
        created: answer.import.counts.created,
      }),
    )
  }

  /**
   * Checks every row of a parsed file against the roster and the records, in order of date and
   * start, as if the rows were added one at a time (HR plan 5.6 IM4, IM5). Each row stops at the
   * first check it fails.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster the file goes into.
   * @param parsed - The rows whose cells are of the right form.
   * @returns The row problems found here and the rows that passed.
   */
  private async checkRows(
    tenantId: string,
    roster: Roster,
    parsed: { parsed: ParsedRosterRow[] },
  ): Promise<{ errors: HrImportError[]; accepted: AcceptedRow[] }> {
    const unit = await this.units.findOne(roster.unit_id)
    const facility = await this.facilities.findOne(roster.facility_id)
    if (!unit || unit.tenant_id !== tenantId || !facility) {
      throw this.rosterNotFound()
    }
    if (unit.status !== 'active') {
      throw new InvalidRequestError('unit_closed', 'The unit is closed.')
    }
    const limits = await readWorkingTimeLimits(this.parameters, tenantId, unit.id)
    const today = todayInZone(facility.timezone)
    const employees = new Map<string, Employee | null>()
    const shifts = new Map<string, ShiftDefinition | null>()
    const errors: HrImportError[] = []
    const candidates: AcceptedRow[] = []
    for (const row of parsed.parsed) {
      const result = await this.resolveRow(
        tenantId,
        roster,
        unit,
        facility.timezone,
        today,
        row,
        employees,
        shifts,
      )
      if ('code' in result) {
        errors.push(this.error(row.row, result.code))
      } else {
        candidates.push(result)
      }
    }
    const byEmployee = new Map<string, AcceptedRow[]>()
    for (const candidate of candidates) {
      const group = byEmployee.get(candidate.employee.id) ?? []
      group.push(candidate)
      byEmployee.set(candidate.employee.id, group)
    }
    const accepted: AcceptedRow[] = []
    for (const group of byEmployee.values()) {
      group.sort(
        (left, right) =>
          left.row.date.localeCompare(right.row.date) ||
          (left.startsAt?.getTime() ?? 0) - (right.startsAt?.getTime() ?? 0) ||
          left.row.row - right.row.row,
      )
      const first = group[0]
      const last = group.at(-1)
      if (!first || !last) {
        continue
      }
      const existing = await this.assignments.findPlannedByEmployeeBetween(
        tenantId,
        first.employee.id,
        addDays(first.row.date, -8),
        addDays(last.row.date, 8),
      )
      const others: WorkingShift[] = existing.map((item) => toWorkingShift(item))
      for (const item of group) {
        const code = await this.checkRow(
          tenantId,
          roster,
          unit,
          item,
          existing,
          others,
          limits,
        )
        if (code === null) {
          accepted.push(item)
          others.push({
            date: item.row.date,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            paidMinutes: item.shift.paid_minutes,
            isNight: item.shift.is_night,
          })
        } else {
          errors.push(this.error(item.row.row, code))
        }
      }
    }
    return { errors, accepted }
  }

  /**
   * Resolves the employee and the shift of a row and checks the date, the role-free parts that
   * need no schedule: the employee exists, the shift can be used, the date is in the period and not
   * in the past.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @param unit - The unit of the roster.
   * @param timeZone - Zone of the facility.
   * @param today - Today in that zone.
   * @param row - The row.
   * @param employees - Cache of employees by number.
   * @param shifts - Cache of shifts by code.
   * @returns The resolved row, or the code of the first problem.
   */
  private async resolveRow(
    tenantId: string,
    roster: Roster,
    unit: OrganizationUnit,
    timeZone: string,
    today: string,
    row: ParsedRosterRow,
    employees: Map<string, Employee | null>,
    shifts: Map<string, ShiftDefinition | null>,
  ): Promise<AcceptedRow | { code: string }> {
    if (!employees.has(row.employeeNumber)) {
      const found = await this.employees.findByNumber(tenantId, row.employeeNumber)
      employees.set(
        row.employeeNumber,
        found && !found.deleted_at ? found : null,
      )
    }
    const employee = employees.get(row.employeeNumber) ?? null
    if (!employee) {
      return { code: 'employee_not_found' }
    }
    if (!shifts.has(row.shiftCode)) {
      const found = await this.shifts.findByCode(
        tenantId,
        roster.facility_id,
        row.shiftCode,
      )
      shifts.set(row.shiftCode, found && !found.deleted_at ? found : null)
    }
    const shift = shifts.get(row.shiftCode) ?? null
    if (!shift) {
      return { code: 'shift_not_found' }
    }
    try {
      assertShiftUsable(shift, roster, unit)
    } catch (error: unknown) {
      return { code: this.codeOf(error) }
    }
    if (!isInPeriod(row.date, roster.period)) {
      return { code: 'date_outside_period' }
    }
    if (row.date < today) {
      return { code: 'assignment_in_past' }
    }
    const instants = shiftInstants(row.date, shift, timeZone)
    return {
      row,
      employee,
      shift,
      startsAt: instants.startsAt,
      endsAt: instants.endsAt,
      overtimeMinutes: 0,
    }
  }

  /**
   * Checks one resolved row against the employee's schedule: status, eligibility, an existing
   * assignment of the day in this roster, and the working-time rules against every other planned
   * shift and the rows accepted before it.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @param unit - The unit of the roster.
   * @param item - The resolved row.
   * @param existing - The employee's planned assignments around the file's dates.
   * @param others - The same as working shifts, plus the rows accepted before; grows.
   * @param limits - The working-time limits.
   * @returns The code of the first problem, or `null`; the overtime of the row is stored on it.
   */
  private async checkRow(
    tenantId: string,
    roster: Roster,
    unit: OrganizationUnit,
    item: AcceptedRow,
    existing: RosterAssignment[],
    others: WorkingShift[],
    limits: Awaited<ReturnType<typeof readWorkingTimeLimits>>,
  ): Promise<string | null> {
    try {
      assertAssignable(item.employee)
      await assertEligible(
        this.eligibility,
        tenantId,
        item.employee,
        unit,
        item.row.date,
      )
      if (
        existing.some(
          (other) =>
            other.roster_id === roster.id && other.date === item.row.date,
        )
      ) {
        return 'assignment_exists'
      }
      item.overtimeMinutes = firstWorkingTimeViolation(
        {
          date: item.row.date,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          paidMinutes: item.shift.paid_minutes,
          isNight: item.shift.is_night,
        },
        others,
        limits,
        item.row.overtimeConsent,
      )
      return null
    } catch (error: unknown) {
      return this.codeOf(error)
    }
  }

  /**
   * Builds the assignment a row would become, to preview the coverage and the rest days.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @param item - The accepted row.
   * @param index - Position of the row, for a temporary identifier.
   * @returns An assignment that is not stored.
   */
  private toAssignment(
    tenantId: string,
    roster: Roster,
    item: AcceptedRow,
    index: number,
  ): RosterAssignment {
    return {
      id: `import-${index}`,
      tenant_id: tenantId,
      schema_version: 1,
      version: 0,
      roster_id: roster.id,
      unit_id: roster.unit_id,
      facility_id: roster.facility_id,
      employee_id: item.employee.id,
      date: item.row.date,
      shift: {
        definition_id: item.shift.id,
        code: item.shift.code,
        type: item.shift.type,
        start_time: item.shift.start_time,
        end_time: item.shift.end_time,
        paid_minutes: item.shift.paid_minutes,
        is_night: item.shift.is_night,
      },
      starts_at: item.startsAt,
      ends_at: item.endsAt,
      role: item.row.role,
      status: 'planned',
      source: { kind: 'import', ref_id: null },
      change_reason: null,
      revision: roster.revision,
      overtime: null,
      flag: null,
      is_flagged: false,
      created_by: { account_id: null, display_name: 'import', kind: 'system' },
    } as RosterAssignment
  }

  /**
   * @param row - Row number.
   * @param code - What is wrong.
   * @returns The row error, with the column the code belongs to when there is one.
   */
  private error(row: number, code: string): HrImportError {
    return { row, column: COLUMNS[code] ?? null, code }
  }

  /**
   * @param error - What a check threw.
   * @returns The code of a workforce rejection.
   * @throws The error itself when it is not a rejection of a rule.
   */
  private codeOf(error: unknown): string {
    if (error instanceof InvalidRequestError) {
      return error.code
    }
    throw error
  }

  /**
   * Reads an import limit.
   *
   * @param tenantId - Tenant of the caller.
   * @param key - `IMPORT_MAX_ROWS` or `IMPORT_MAX_ERRORS`.
   * @returns The limit.
   */
  private async limit(tenantId: string, key: string): Promise<number> {
    return Number((await this.parameters.resolve(tenantId, { key })).value)
  }

  /**
   * Refuses a roster that is not a draft (HR plan 5.6 IM2).
   *
   * @param roster - The roster.
   * @throws InvalidRequestError `roster_closed` or `roster_locked`.
   */
  private assertDraft(roster: Roster): void {
    if (roster.status === 'closed') {
      throw new InvalidRequestError(
        'roster_closed',
        'A closed roster cannot be changed.',
      )
    }
    if (roster.status !== 'draft') {
      throw new InvalidRequestError(
        'roster_locked',
        'A file can be imported only into a draft roster.',
      )
    }
  }

  /**
   * @returns The signed-in actor.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError(
        'actor_required',
        'A signed-in actor is required.',
      )
    }
    return actor
  }

  /**
   * Loads a roster of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @returns The roster.
   * @throws NotFoundError `roster_not_found`.
   */
  private async loadRoster(tenantId: string, id: string): Promise<Roster> {
    const roster = await this.rosters.findOne(id)
    if (!roster || roster.tenant_id !== tenantId || roster.deleted_at) {
      throw this.rosterNotFound()
    }
    return roster
  }

  /**
   * @returns The not-found error for a roster.
   */
  private rosterNotFound(): NotFoundError {
    return new NotFoundError('roster_not_found', 'The roster was not found.')
  }
}
