import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { compareLocalDates, todayInZone } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type PositionRepository } from '@repository/interface/position'
import {
  type PositionAssignmentRepository,
  type UnitAssignmentQuery,
} from '@repository/interface/position-assignment'
import { type Coding } from '@repository/model/common/coding'
import { type DatePeriod } from '@repository/model/common/calendar'
import { type Employee } from '@repository/model/employee'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type Position } from '@repository/model/position'
import { type PositionAssignment } from '@repository/model/position-assignment'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_POSITION,
  REPOSITORY_POSITION_ASSIGNMENT,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  ACTING_KIND,
  addDays,
  checkAssignmentPeriod,
  isValidAssignmentFte,
  normalizeDecisionNumber,
  periodsOverlap,
  sumFte,
} from './assignment-rules'

const NAME = 'AssignmentService'

/**
 * Code system name suffix of assignment kinds, after an optional country prefix.
 */
const KIND_SYSTEM = /(^|\.)assignment-kind$/

/**
 * Data of a new assignment.
 *
 * @property employeeId - The employee.
 * @property positionId - The position.
 * @property contractId - Active contract of the employee the assignment runs under.
 * @property kind - Assignment kind code.
 * @property period - Start, and end (required for acting and secondment).
 * @property fte - Full-time equivalent; default 1.
 * @property isPrimary - Whether this is the primary assignment; default true for the first one.
 * @property decisionNumber - Decision (SK) number.
 * @property reason - Why, kept in the change history.
 */
export interface CreateAssignmentInput {
  employeeId: string
  positionId: string
  contractId: string
  kind: Coding
  period: DatePeriod
  fte?: number
  isPrimary?: boolean
  decisionNumber?: string
  reason?: string
}

/**
 * Data of the end of an assignment.
 *
 * @property date - Last day of the assignment.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface EndAssignmentInput {
  date: string
  version?: number
  reason?: string
}

/**
 * Position assignments: who holds which position, and the history (HR plan 2.4). Never edits or
 * deletes: an assignment is created and later ended.
 */
@Injectable()
export class AssignmentService {
  /**
   * @param assignments - Assignment repository.
   * @param employees - Employee repository, for the employee and the primary summary.
   * @param positions - Position repository.
   * @param units - Unit repository, to check the unit of a list.
   * @param facilities - Facility repository, for the time zone.
   * @param contracts - Contract repository.
   * @param concepts - Code concepts, to check the kind.
   * @param transactions - Transaction manager, so an assignment and the summary change together.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_POSITION_ASSIGNMENT)
    private readonly assignments: PositionAssignmentRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_POSITION)
    private readonly positions: PositionRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the assignments of an employee, newest start first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The assignments.
   * @throws NotFoundError `employee_not_found`.
   */
  async listByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<PositionAssignment[]> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw new NotFoundError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    return this.assignments.findByEmployee(tenantId, employee.id)
  }

  /**
   * Lists the assignments of one unit (not the units below it). Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - Unit identifier.
   * @param query - Optional status filter and paging.
   * @returns The assignments.
   * @throws NotFoundError `unit_not_found`.
   */
  async listByUnit(
    tenantId: string,
    unitId: string,
    query: UnitAssignmentQuery,
  ): Promise<PositionAssignment[]> {
    const unit = await this.units.findOne(unitId)
    if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
      throw new NotFoundError('unit_not_found', 'The unit was not found.')
    }
    return this.assignments.findByUnit(tenantId, unit.id, query)
  }

  /**
   * Creates an assignment (HR plan A1 to A12).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The assignment.
   * @returns The created assignment.
   * @throws InvalidRequestError `invalid_fte`, `invalid_decision_number`, `invalid_kind`,
   * `unknown_code`, `code_retired`, `code_not_in_period`, `employee_not_found`, `employee_separated`,
   * `position_not_found`, `position_closed`, `contract_not_found`, `contract_not_active`,
   * `invalid_period`, `end_date_required` or `period_outside_contract`.
   * @throws ConflictError `fte_exceeded`, `primary_exists`, `head_exists` or `headcount_exceeded`.
   */
  create(
    tenantId: string,
    input: CreateAssignmentInput,
  ): Promise<PositionAssignment> {
    return observe(
      this.logger,
      'assignment_create',
      `${NAME}.create`,
      async () => {
        const fte = input.fte ?? 1
        if (!isValidAssignmentFte(fte)) {
          throw new InvalidRequestError(
            'invalid_fte',
            'The full-time equivalent must be above 0 and at most 1, with at most two decimals.',
          )
        }
        const decisionNumber =
          input.decisionNumber === undefined
            ? null
            : normalizeDecisionNumber(input.decisionNumber)
        if (input.decisionNumber !== undefined && decisionNumber === null) {
          throw new InvalidRequestError(
            'invalid_decision_number',
            'The decision number must have 1 to 80 characters.',
          )
        }
        if (!KIND_SYSTEM.test(input.kind.system)) {
          throw new InvalidRequestError(
            'invalid_kind',
            'The kind must come from an assignment-kind code system, for example id.assignment-kind.',
          )
        }
        await this.concepts.assertActive(tenantId, input.kind)

        const employee = await this.employee(tenantId, input.employeeId)
        const position = await this.position(tenantId, input.positionId)
        const facilityId = await this.facilityOf(position)
        const contract = await this.contract(tenantId, employee, input.contractId)
        const problem = checkAssignmentPeriod(
          input.period,
          input.kind.code,
          contract.period,
        )
        if (problem) {
          throw new InvalidRequestError(problem.code, problem.message)
        }
        const today = await this.today(facilityId)
        const status = compareLocalDates(input.period.start, today) > 0
          ? 'planned'
          : 'active'

        const open = await this.assignments.findOpenByEmployee(
          tenantId,
          employee.id,
        )
        const isPrimary = input.isPrimary ?? open.length === 0
        const period: DatePeriod = {
          start: input.period.start,
          end: input.period.end,
        }
        const overlapping = open.filter(
          (item) =>
            item.contract_id === contract.id && periodsOverlap(item.period, period),
        )
        if (
          sumFte([...overlapping.map((item) => item.fte), fte]) > contract.fte
        ) {
          throw new ConflictError(
            'fte_exceeded',
            'The full-time equivalents of overlapping assignments exceed the contract.',
          )
        }
        if (isPrimary && open.some((item) => item.is_primary)) {
          throw this.primaryExists()
        }
        const holders = await this.assignments.findOpenByPosition(
          tenantId,
          position.id,
        )
        if (position.is_head_of_unit && holders.length > 0) {
          throw this.headExists()
        }
        if (input.kind.code !== ACTING_KIND) {
          const counted = holders.filter(
            (item) =>
              item.kind.code !== ACTING_KIND &&
              periodsOverlap(item.period, period),
          )
          if (counted.length >= position.budgeted_headcount) {
            throw new ConflictError(
              'headcount_exceeded',
              'The position already has as many holders as its budgeted headcount.',
            )
          }
        }

        const write = (): Promise<PositionAssignment> =>
          this.transactions.run(async () => {
            const created = await this.assignments.create({
              tenant_id: tenantId,
              employee_id: employee.id,
              contract_id: contract.id,
              position_id: position.id,
              unit_id: position.unit_id,
              facility_id: facilityId,
              is_primary: isPrimary,
              is_head_of_unit: position.is_head_of_unit,
              kind: { system: input.kind.system, code: input.kind.code },
              period,
              fte,
              status,
              is_open: true,
              decision_ref: decisionNumber
                ? { number: decisionNumber, document: null }
                : null,
            })
            if (status === 'active' && isPrimary) {
              await this.employees.update(employee.id, {
                primary_assignment: {
                  assignment_id: created.id,
                  facility_id: created.facility_id,
                  unit_id: created.unit_id,
                  position_id: created.position_id,
                },
              })
            }
            return created
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          // Two requests at once: the unique indexes decided.
          if (error instanceof RepositoryConflictError) {
            throw isPrimary ? this.primaryExists() : this.headExists()
          }
          throw error
        }
      },
    )
  }

  /**
   * Ends an open assignment on a date (HR plan A9).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Assignment identifier.
   * @param input - Last day, optional version and reason.
   * @returns The ended assignment.
   * @throws NotFoundError `assignment_not_found`.
   * @throws InvalidRequestError `assignment_not_open` or `invalid_end_date`.
   * @throws ConflictError `stale_version`.
   */
  end(
    tenantId: string,
    id: string,
    input: EndAssignmentInput,
  ): Promise<PositionAssignment> {
    return observe(this.logger, 'assignment_end', `${NAME}.end`, async () => {
      const assignment = await this.assignments.findOne(id)
      if (
        !assignment ||
        assignment.tenant_id !== tenantId ||
        assignment.deleted_at
      ) {
        throw new NotFoundError(
          'assignment_not_found',
          'The assignment was not found.',
        )
      }
      if (!assignment.is_open) {
        throw new InvalidRequestError(
          'assignment_not_open',
          'The assignment has already ended.',
        )
      }
      const today = await this.today(assignment.facility_id)
      const latest = addDays(today, 1)
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
        compareLocalDates(input.date, assignment.period.start) < 0 ||
        compareLocalDates(input.date, latest) > 0 ||
        addDays(input.date, 0) !== input.date
      ) {
        throw new InvalidRequestError(
          'invalid_end_date',
          'The end date must be a real date, not before the start and not later than tomorrow.',
        )
      }
      if (
        input.version !== undefined &&
        input.version !== assignment.version
      ) {
        throw this.stale()
      }
      const employee = await this.employees.findOne(assignment.employee_id)
      const write = (): Promise<PositionAssignment> =>
        this.transactions.run(async () => {
          const ended = await this.assignments.update(
            assignment.id,
            {
              status: 'ended',
              is_open: false,
              period: { start: assignment.period.start, end: input.date },
            },
            { expectedVersion: input.version },
          )
          if (employee?.primary_assignment?.assignment_id === assignment.id) {
            await this.employees.update(employee.id, {
              primary_assignment: null,
            })
          }
          return ended
        })
      try {
        return await (input.reason
          ? withChangeReason(input.reason, write)
          : write())
      } catch (error: unknown) {
        if (error instanceof RepositoryConflictError) {
          throw this.stale()
        }
        if (error instanceof RepositoryNotFoundError) {
          throw new NotFoundError(
            'assignment_not_found',
            'The assignment was not found.',
          )
        }
        throw error
      }
    })
  }

  /**
   * Finds the facility of a position: the facility of its unit.
   *
   * @param position - The position.
   * @returns The facility identifier.
   * @throws InvalidRequestError `position_not_found` when the unit is missing.
   */
  private async facilityOf(position: Position): Promise<string> {
    const unit = await this.units.findOne(position.unit_id, { withSoft: true })
    if (!unit) {
      throw new InvalidRequestError(
        'position_not_found',
        'The position was not found.',
      )
    }
    return unit.facility_id
  }

  /**
   * Today's date in the facility's time zone (HR plan A4).
   *
   * @param facilityId - Facility identifier.
   * @returns Today as a local date.
   * @throws InvalidRequestError `position_not_found` when the facility is missing.
   */
  private async today(facilityId: string): Promise<string> {
    const facility = await this.facilities.findOne(facilityId)
    if (!facility) {
      throw new InvalidRequestError(
        'position_not_found',
        'The position was not found.',
      )
    }
    return todayInZone(facility.timezone)
  }

  /**
   * Loads an employee that can take an assignment.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The employee.
   * @throws InvalidRequestError `employee_not_found` or `employee_separated`.
   */
  private async employee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw new InvalidRequestError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    if (employee.employment_status === 'separated') {
      throw new InvalidRequestError(
        'employee_separated',
        'The employee has separated.',
      )
    }
    return employee
  }

  /**
   * Loads an active position of the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param positionId - Position identifier.
   * @returns The position.
   * @throws InvalidRequestError `position_not_found` or `position_closed`.
   */
  private async position(
    tenantId: string,
    positionId: string,
  ): Promise<Position> {
    const position = await this.positions.findOne(positionId)
    if (!position || position.tenant_id !== tenantId || position.deleted_at) {
      throw new InvalidRequestError(
        'position_not_found',
        'The position was not found.',
      )
    }
    if (position.status !== 'active') {
      throw new InvalidRequestError(
        'position_closed',
        'The position is closed.',
      )
    }
    return position
  }

  /**
   * Loads the active contract of the employee that the assignment runs under.
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The employee.
   * @param contractId - Contract identifier.
   * @returns The contract.
   * @throws InvalidRequestError `contract_not_found` or `contract_not_active`.
   */
  private async contract(
    tenantId: string,
    employee: Employee,
    contractId: string,
  ): Promise<EmploymentContract> {
    const contract = await this.contracts.findOne(contractId)
    if (
      !contract ||
      contract.tenant_id !== tenantId ||
      contract.employee_id !== employee.id
    ) {
      throw new InvalidRequestError(
        'contract_not_found',
        'The contract was not found.',
      )
    }
    if (contract.status !== 'active') {
      throw new InvalidRequestError(
        'contract_not_active',
        'The contract is not active.',
      )
    }
    return contract
  }

  /**
   * @returns The conflict for a second open primary assignment.
   */
  private primaryExists(): ConflictError {
    return new ConflictError(
      'primary_exists',
      'The employee already has an open primary assignment.',
    )
  }

  /**
   * @returns The conflict for a second holder of a head-of-unit position.
   */
  private headExists(): ConflictError {
    return new ConflictError(
      'head_exists',
      'The head-of-unit position already has a holder.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The assignment was changed by someone else. Reload it and try again.',
    )
  }
}
