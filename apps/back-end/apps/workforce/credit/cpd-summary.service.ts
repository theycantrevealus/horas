import { Inject, Injectable } from '@nestjs/common'
import { RepositoryConflictError } from '@utility/database/error'
import { AppLogger } from '@utility/logger/service'
import { type CpdRecordRepository } from '@repository/interface/cpd-record'
import { type CpdSummaryRepository } from '@repository/interface/cpd-summary'
import { type Coding } from '@repository/model/common/coding'
import { type CpdSummary } from '@repository/model/cpd-summary'
import { type Employee } from '@repository/model/employee'
import {
  type EmployeeRepository,
} from '@repository/interface/employee'
import {
  REPOSITORY_CPD_RECORD,
  REPOSITORY_CPD_SUMMARY,
  REPOSITORY_EMPLOYEE,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { isValidCycle, isValidTotal, sumPoints } from './cpd-rules'

const NAME = 'CpdSummaryService'

/**
 * Code system name suffix of credit systems, after an optional country prefix.
 */
const CREDIT_SYSTEM = /(^|\.)credit-system$/

/**
 * A stored credit total with the points of the employee's accepted records inside its cycle, so
 * HR can compare it with the number of the national platform (HR plan 3.2 CR11).
 *
 * @property accepted_points - Sum of the accepted records of this credit system in the cycle.
 */
export type CpdSummaryView = CpdSummary & { accepted_points: number }

/**
 * Data of a platform total.
 *
 * @property creditSystem - Credit system code; its code must equal the path.
 * @property cycle - Counting period, both ends required.
 * @property totalPoints - Total read from the platform.
 * @property checkedAt - When it was read; defaults to now.
 */
export interface SetCpdSummaryInput {
  creditSystem: Coding
  cycle: { start: string; end: string }
  totalPoints: number
  checkedAt?: Date
}

/**
 * Credit totals: the latest total known per credit system, read from a national platform
 * (HR plan 3.2 B2). A new total replaces the old one; the old values stay in the change history.
 */
@Injectable()
export class CpdSummaryService {
  /**
   * @param summaries - Summary repository.
   * @param records - Credit record repository, for the accepted points in a cycle.
   * @param employees - Employee repository.
   * @param concepts - Code concepts, to check the credit system.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CPD_SUMMARY)
    private readonly summaries: CpdSummaryRepository,
    @Inject(REPOSITORY_CPD_RECORD)
    private readonly records: CpdRecordRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the stored totals of an employee, each with the accepted points of its cycle. Writes no
   * log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The totals, ordered by credit system code.
   * @throws NotFoundError `employee_not_found`.
   */
  async list(tenantId: string, employeeId: string): Promise<CpdSummaryView[]> {
    const employee = await this.employee(tenantId, employeeId)
    const stored = await this.summaries.findByEmployee(tenantId, employee.id)
    const views: CpdSummaryView[] = []
    for (const summary of stored) {
      views.push(await this.view(tenantId, summary))
    }
    return views
  }

  /**
   * Records the total read from a national platform: creates the summary or replaces the earlier
   * total (HR plan 3.2 CR9 and CR10).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @param systemCode - The credit system code of the request path.
   * @param input - Credit system, cycle, total and optional read time.
   * @returns The stored total with its accepted points.
   * @throws NotFoundError `employee_not_found`.
   * @throws InvalidRequestError `employee_separated`, `profession_required`,
   * `invalid_credit_system`, `credit_system_mismatch`, `unknown_code`, `code_retired`,
   * `code_not_in_period`, `invalid_cycle`, `invalid_total` or `invalid_checked_at`.
   */
  set(
    tenantId: string,
    employeeId: string,
    systemCode: string,
    input: SetCpdSummaryInput,
  ): Promise<CpdSummaryView> {
    return observe(
      this.logger,
      'cpd_summary_set',
      `${NAME}.set`,
      async () => {
        const employee = await this.employee(tenantId, employeeId)
        if (employee.employment_status === 'separated') {
          throw new InvalidRequestError(
            'employee_separated',
            'The employee has separated.',
          )
        }
        if (!employee.profession) {
          throw new InvalidRequestError(
            'profession_required',
            'The employee has no profession, which the credit requirement depends on.',
          )
        }
        if (!CREDIT_SYSTEM.test(input.creditSystem.system)) {
          throw new InvalidRequestError(
            'invalid_credit_system',
            'The credit system must come from a credit-system code system, for example id.credit-system.',
          )
        }
        if (input.creditSystem.code !== systemCode) {
          throw new InvalidRequestError(
            'credit_system_mismatch',
            'The credit system in the path differs from the one in the body.',
          )
        }
        await this.concepts.assertActive(tenantId, input.creditSystem)
        if (!isValidCycle(input.cycle.start, input.cycle.end)) {
          throw new InvalidRequestError(
            'invalid_cycle',
            'The cycle needs two real dates from 1950-01-01 to ten years ahead, the end not before the start.',
          )
        }
        if (!isValidTotal(input.totalPoints)) {
          throw new InvalidRequestError(
            'invalid_total',
            'The total must be from 0 to 10000 with at most two decimals.',
          )
        }
        const now = new Date()
        const checkedAt = input.checkedAt ?? now
        if (
          Number.isNaN(checkedAt.getTime()) ||
          checkedAt.getTime() > now.getTime()
        ) {
          throw new InvalidRequestError(
            'invalid_checked_at',
            'The time the total was read cannot be in the future.',
          )
        }
        const values = {
          profession: {
            system: employee.profession.system,
            code: employee.profession.code,
          },
          cycle: { start: input.cycle.start, end: input.cycle.end },
          total_points: input.totalPoints,
          checked_at: checkedAt,
          source: 'external_platform' as const,
        }
        const system = input.creditSystem.system
        const code = input.creditSystem.code
        const existing = await this.summaries.findByEmployeeAndSystem(
          tenantId,
          employee.id,
          system,
          code,
        )
        const stored = existing
          ? await this.summaries.update(existing.id, values)
          : await this.create(tenantId, employee.id, input.creditSystem, values)
        return this.view(tenantId, stored)
      },
    )
  }

  /**
   * Creates the summary; when two requests race, the unique index decides and the loser replaces
   * the winner's values.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param creditSystem - The credit system.
   * @param values - The values to store.
   * @returns The stored summary.
   */
  private async create(
    tenantId: string,
    employeeId: string,
    creditSystem: Coding,
    values: Pick<
      CpdSummary,
      'profession' | 'cycle' | 'total_points' | 'checked_at' | 'source'
    >,
  ): Promise<CpdSummary> {
    try {
      return await this.summaries.create({
        tenant_id: tenantId,
        employee_id: employeeId,
        credit_system: {
          system: creditSystem.system,
          code: creditSystem.code,
        },
        ...values,
      })
    } catch (error: unknown) {
      if (!(error instanceof RepositoryConflictError)) {
        throw error
      }
      const winner = await this.summaries.findByEmployeeAndSystem(
        tenantId,
        employeeId,
        creditSystem.system,
        creditSystem.code,
      )
      if (!winner) {
        throw error
      }
      return this.summaries.update(winner.id, values)
    }
  }

  /**
   * Adds the accepted points of the cycle to a stored total.
   *
   * @param tenantId - Tenant of the caller.
   * @param summary - The stored total.
   * @returns The total with its accepted points.
   */
  private async view(
    tenantId: string,
    summary: CpdSummary,
  ): Promise<CpdSummaryView> {
    const accepted = await this.records.findAcceptedInCycle(
      tenantId,
      summary.employee_id,
      summary.credit_system,
      summary.cycle.start,
      summary.cycle.end,
    )
    return {
      id: summary.id,
      tenant_id: summary.tenant_id,
      schema_version: summary.schema_version,
      version: summary.version,
      employee_id: summary.employee_id,
      credit_system: summary.credit_system,
      profession: summary.profession,
      cycle: summary.cycle,
      total_points: summary.total_points,
      checked_at: summary.checked_at,
      source: summary.source,
      created_by: summary.created_by,
      created_at: summary.created_at,
      updated_at: summary.updated_at,
      deleted_at: summary.deleted_at,
      accepted_points: sumPoints(accepted.map((record) => record.points)),
    }
  }

  /**
   * Loads an employee of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found`.
   */
  private async employee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw new NotFoundError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    return employee
  }
}
