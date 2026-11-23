import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { type ActorRef } from '@utility/history/actor'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type PositionAssignmentRepository } from '@repository/interface/position-assignment'
import { type SeparationRepository } from '@repository/interface/separation'
import { type SeparationDetailRepository } from '@repository/interface/separation-detail'
import { type Coding } from '@repository/model/common/coding'
import { type Employee } from '@repository/model/employee'
import {
  type Separation,
  type SeparationChecklistItem,
  type SeparationStatus,
} from '@repository/model/separation'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_POSITION_ASSIGNMENT,
  REPOSITORY_SEPARATION,
  REPOSITORY_SEPARATION_DETAIL,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { systemSuffix } from '../concept/system-rules'
import { LeavePlaceService } from '../leave/leave-place'
import { observe } from '../observe'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  MAX_CANCEL_REASON_LENGTH,
  MAX_CHECKLIST_ITEMS,
  MAX_REASON_LENGTH,
  checkLastWorkingDay,
  checkNoticeDate,
  checkReason,
} from './separation-rules'

const NAME = 'SeparationService'

/**
 * A new separation.
 *
 * @property type - The separation type, a code of `…separation-type`.
 * @property lastWorkingDay - The last day the employee works.
 * @property noticeReceivedOn - When notice was given.
 * @property immediate - Completed when recorded (a dismissal or a death).
 * @property reason - Why, 1 to 1000 characters; kept apart, never logged.
 */
export interface CreateSeparationInput {
  type: Coding
  lastWorkingDay: string
  noticeReceivedOn?: string | null
  immediate?: boolean
  reason: string
}

/**
 * Changes to a planned separation; fields that are not sent stay as they are.
 *
 * @property type - A new type.
 * @property lastWorkingDay - A new last working day.
 * @property noticeReceivedOn - A new notice date, or `null` to clear it.
 * @property reason - A new reason.
 * @property version - Version the caller read.
 */
export interface UpdateSeparationInput {
  type?: Coding
  lastWorkingDay?: string
  noticeReceivedOn?: string | null
  reason?: string
  version?: number
}

/**
 * Filters and paging of the list.
 *
 * @property unitId - Only employees with an open assignment in this unit.
 */
export interface ListSeparationsQuery {
  status?: SeparationStatus
  typeCode?: string
  unitId?: string
  facilityId?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/**
 * Ending an employee's employment (HR spec 9.10, HR plan 9): record, change, cancel, read and the
 * exit checklist. Completion is `SeparationCompletionService`. The reason is kept in the separate
 * detail, never shown in lists and never logged (`HR-SEP-008`).
 */
@Injectable()
export class SeparationService {
  /**
   * @param separations - Separation repository.
   * @param reasons - Separation detail repository, where the reasons are kept.
   * @param employees - Employee repository.
   * @param assignments - Position assignment repository, to find the employees of a unit.
   * @param concepts - Code concepts, for the type and the checklist.
   * @param place - Finds the employee's facility and today.
   * @param changes - Change recorder, for the access record of a detail read.
   * @param transactions - Transaction manager, so a separation and its detail are written together.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_SEPARATION)
    private readonly separations: SeparationRepository,
    @Inject(REPOSITORY_SEPARATION_DETAIL)
    private readonly reasons: SeparationDetailRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_POSITION_ASSIGNMENT)
    private readonly assignments: PositionAssignmentRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
    @Inject(CHANGE_RECORDER) private readonly changes: ChangeRecorder,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Records a separation (HR plan 9 SP1). An immediate separation is only recorded here; completing
   * it is `SeparationCompletionService`.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee who is leaving.
   * @param input - The separation.
   * @returns The separation, without its reason.
   * @throws NotFoundError `employee_not_found`.
   * @throws InvalidRequestError `employee_separated`, `invalid_separation_type`,
   * `invalid_last_working_day`, `invalid_notice_date`, `reason_required`, `invalid_reason` and the
   * concept service's `unknown_code`, `code_retired` or `code_not_in_period`.
   * @throws ConflictError `separation_exists`.
   */
  create(
    tenantId: string,
    employeeId: string,
    input: CreateSeparationInput,
  ): Promise<Separation> {
    return observe(
      this.logger,
      'separation_create',
      `${NAME}.create`,
      async () => {
        const employee = await this.loadEmployee(tenantId, employeeId)
        if (employee.employment_status === 'separated') {
          throw new InvalidRequestError(
            'employee_separated',
            'The employee has already separated.',
          )
        }
        if (await this.separations.findOpenByEmployee(tenantId, employee.id)) {
          throw this.exists()
        }
        const reason = checkReason(input.reason, MAX_REASON_LENGTH)
        const contractAction = await this.checkType(tenantId, input.type)
        const place = await this.place.of(tenantId, employee.id)
        const immediate = input.immediate === true
        checkLastWorkingDay(
          input.lastWorkingDay,
          place.today,
          immediate,
          employee.original_hire_date,
        )
        const notice = input.noticeReceivedOn ?? null
        checkNoticeDate(notice, input.lastWorkingDay)
        const checklist = await this.buildChecklist(tenantId, input.type.system)
        try {
          return await this.transactions.run(async () => {
            const separation = await this.separations.create({
              tenant_id: tenantId,
              employee_id: employee.id,
              facility_id: place.facility?.id ?? null,
              type: { system: input.type.system, code: input.type.code },
              contract_action: contractAction,
              last_working_day: input.lastWorkingDay,
              notice_received_on: notice,
              immediate,
              status: 'planned',
              status_since: new Date(),
              completion: null,
              checklist,
              settlement: null,
            })
            await this.reasons.create({
              tenant_id: tenantId,
              separation_id: separation.id,
              employee_id: employee.id,
              reason,
            })
            return separation
          })
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw this.exists()
          }
          throw error
        }
      },
    )
  }

  /**
   * Changes a planned separation (HR plan 9 SP3): the last working day, the type, the notice date
   * or the reason. An immediate separation cannot be changed.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @param input - The changes and the version read.
   * @returns The updated separation.
   * @throws NotFoundError `separation_not_found`.
   * @throws InvalidRequestError `empty_update`, `separation_not_planned`, `separation_immediate`
   * and the codes of `create`.
   * @throws ConflictError `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateSeparationInput,
  ): Promise<Separation> {
    return observe(
      this.logger,
      'separation_update',
      `${NAME}.update`,
      async () => {
        const separation = await this.load(tenantId, id)
        this.assertPlanned(separation)
        if (separation.immediate) {
          throw new InvalidRequestError(
            'separation_immediate',
            'An immediate separation cannot be changed.',
          )
        }
        const sent = {
          type: input.type,
          lastWorkingDay: input.lastWorkingDay,
          noticeReceivedOn: input.noticeReceivedOn,
          reason: input.reason,
        }
        if (Object.values(sent).every((value) => value === undefined)) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        this.checkVersion(separation, input.version)
        const employee = await this.loadEmployee(tenantId, separation.employee_id)
        const place = await this.place.of(tenantId, employee.id)
        const lastWorkingDay = input.lastWorkingDay ?? separation.last_working_day
        if (input.lastWorkingDay !== undefined) {
          checkLastWorkingDay(
            input.lastWorkingDay,
            place.today,
            false,
            employee.original_hire_date,
          )
        }
        const notice =
          input.noticeReceivedOn === undefined
            ? separation.notice_received_on
            : input.noticeReceivedOn
        checkNoticeDate(notice, lastWorkingDay)
        const contractAction = input.type
          ? await this.checkType(tenantId, input.type)
          : separation.contract_action
        const reason =
          input.reason === undefined
            ? null
            : checkReason(input.reason, MAX_REASON_LENGTH)
        const detail =
          reason === null
            ? null
            : await this.reasons.findBySeparation(tenantId, separation.id)
        if (reason !== null && !detail) {
          throw this.notFound()
        }
        return this.write(() =>
          this.transactions.run(async () => {
            const updated = await this.separations.update(
              separation.id,
              {
                type: input.type
                  ? { system: input.type.system, code: input.type.code }
                  : separation.type,
                contract_action: contractAction,
                last_working_day: lastWorkingDay,
                notice_received_on: notice,
              },
              { expectedVersion: separation.version },
            )
            if (reason !== null && detail) {
              await this.reasons.update(detail.id, { reason })
            }
            return updated
          }),
        )
      },
    )
  }

  /**
   * Cancels a planned separation, for example a resignation that was withdrawn (HR plan 9 SP3).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @param input - The reason (1 to 500 characters) and the version read.
   * @returns The cancelled separation.
   * @throws NotFoundError `separation_not_found`.
   * @throws InvalidRequestError `separation_not_planned`, `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  cancel(
    tenantId: string,
    id: string,
    input: { reason: string; version?: number },
  ): Promise<Separation> {
    return observe(
      this.logger,
      'separation_cancel',
      `${NAME}.cancel`,
      async () => {
        const separation = await this.load(tenantId, id)
        this.assertPlanned(separation)
        const reason = checkReason(input.reason, MAX_CANCEL_REASON_LENGTH)
        this.checkVersion(separation, input.version)
        return this.write(() =>
          withChangeReason(reason, () =>
            this.separations.update(
              separation.id,
              { status: 'cancelled', status_since: new Date() },
              { expectedVersion: separation.version },
            ),
          ),
        )
      },
    )
  }

  /**
   * Marks an item of the exit checklist done or not done (HR plan 9). It stays open after
   * completion, until HR marks every item.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @param item - The checklist item and whether it is done.
   * @param version - Version the caller read.
   * @returns The separation.
   * @throws NotFoundError `separation_not_found`.
   * @throws InvalidRequestError `separation_cancelled` or `checklist_item_not_found`.
   * @throws ForbiddenError `actor_required`.
   * @throws ConflictError `stale_version`.
   */
  setChecklistItem(
    tenantId: string,
    id: string,
    item: { system: string; code: string; done: boolean },
    version?: number,
  ): Promise<Separation> {
    return observe(
      this.logger,
      'separation_checklist',
      `${NAME}.setChecklistItem`,
      async () => {
        const separation = await this.load(tenantId, id)
        if (separation.status === 'cancelled') {
          throw new InvalidRequestError(
            'separation_cancelled',
            'The separation was cancelled.',
          )
        }
        const index = separation.checklist.findIndex(
          (entry) =>
            entry.item.system === item.system && entry.item.code === item.code,
        )
        if (index < 0) {
          throw new InvalidRequestError(
            'checklist_item_not_found',
            'The separation has no such checklist item.',
          )
        }
        const actor = this.actor()
        this.checkVersion(separation, version)
        const checklist: SeparationChecklistItem[] = separation.checklist.map(
          (entry, position) =>
            position === index
              ? { item: entry.item, done: item.done ? { by: actor, at: new Date() } : null }
              : entry,
        )
        return this.write(() =>
          this.separations.update(
            separation.id,
            { checklist },
            { expectedVersion: separation.version },
          ),
        )
      },
    )
  }

  /**
   * Lists separations, by last working day, latest first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Filters and paging.
   * @returns The separations, without reasons.
   */
  async list(
    tenantId: string,
    query: ListSeparationsQuery,
  ): Promise<Separation[]> {
    let employeeIds: string[] | undefined
    if (query.unitId !== undefined) {
      const inUnit = await this.assignments.findByUnit(tenantId, query.unitId)
      employeeIds = [
        ...new Set(
          inUnit
            .filter((assignment) => assignment.status !== 'ended')
            .map((assignment) => assignment.employee_id),
        ),
      ]
      if (employeeIds.length === 0) {
        return []
      }
    }
    return this.separations.findByFilter(tenantId, {
      status: query.status,
      typeCode: query.typeCode,
      facilityId: query.facilityId,
      employeeIds,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Reads one separation, without its reason. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @returns The separation.
   * @throws NotFoundError `separation_not_found`.
   */
  get(tenantId: string, id: string): Promise<Separation> {
    return this.load(tenantId, id)
  }

  /**
   * Reads the reason of a separation. Each read records one access entry in the change log before
   * the reason is returned, and nothing is returned if recording fails (`HR-AUD-003`).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @returns The reason.
   * @throws NotFoundError `separation_not_found`.
   */
  async details(tenantId: string, id: string): Promise<{ reason: string }> {
    const separation = await this.load(tenantId, id)
    const detail = await this.reasons.findBySeparation(tenantId, separation.id)
    if (!detail) {
      throw this.notFound()
    }
    await this.changes.recordAccess({
      type: 'separation_detail',
      id: detail.id,
      operation: `${NAME}.details`,
      tenantId,
    })
    return { reason: detail.reason }
  }

  /**
   * Checks a separation type and finds the contract action it implies.
   *
   * @param tenantId - Tenant of the caller.
   * @param type - The type as sent.
   * @returns `end` or `terminate`.
   * @throws InvalidRequestError `invalid_separation_type` and the concept service's codes.
   */
  private async checkType(
    tenantId: string,
    type: Coding,
  ): Promise<'end' | 'terminate'> {
    if (systemSuffix(type?.system ?? '') !== 'separation-type') {
      throw new InvalidRequestError(
        'invalid_separation_type',
        'The type must be a code of a separation type system.',
      )
    }
    const concept = await this.concepts.assertActive(tenantId, type)
    const action = concept.properties['contract_action']
    if (action !== 'end' && action !== 'terminate') {
      throw new InvalidRequestError(
        'invalid_separation_type',
        'The separation type does not say what happens to the contract.',
      )
    }
    return action
  }

  /**
   * Builds the exit checklist from the tenant's active checklist codes, in the country of the type.
   *
   * @param tenantId - Tenant of the caller.
   * @param typeSystem - The system of the separation type, such as `id.separation-type`.
   * @returns One open item per active code, at most 50.
   */
  private async buildChecklist(
    tenantId: string,
    typeSystem: string,
  ): Promise<SeparationChecklistItem[]> {
    const prefix = typeSystem.slice(0, typeSystem.indexOf('.'))
    const items = await this.concepts.list(tenantId, {
      system: `${prefix}.exit-checklist-item`,
      status: 'active',
    })
    return items.slice(0, MAX_CHECKLIST_ITEMS).map((concept) => ({
      item: { system: concept.system, code: concept.code },
      done: null,
    }))
  }

  /**
   * Loads an employee of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found`.
   */
  private async loadEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new NotFoundError('employee_not_found', 'The employee was not found.')
    }
    return employee
  }

  /**
   * Loads a separation of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @returns The separation.
   * @throws NotFoundError `separation_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Separation> {
    const separation = await this.separations.findOne(id)
    if (!separation || separation.tenant_id !== tenantId || separation.deleted_at) {
      throw this.notFound()
    }
    return separation
  }

  /**
   * Checks that the separation is still planned.
   *
   * @param separation - The separation.
   * @throws InvalidRequestError `separation_not_planned`.
   */
  private assertPlanned(separation: Separation): void {
    if (separation.status !== 'planned') {
      throw new InvalidRequestError(
        'separation_not_planned',
        'Only a planned separation can change.',
      )
    }
  }

  /**
   * Checks the version the caller read.
   *
   * @param separation - The separation as stored.
   * @param version - The version the caller read, if sent.
   * @throws ConflictError `stale_version`.
   */
  private checkVersion(separation: Separation, version: number | undefined): void {
    if (version !== undefined && version !== separation.version) {
      throw this.stale()
    }
  }

  /**
   * Runs a write and turns a repository rejection into a workforce error.
   *
   * @param work - The write.
   * @returns What the write returns.
   * @throws ConflictError `stale_version`.
   * @throws NotFoundError `separation_not_found`.
   */
  private async write<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work()
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
   * @returns The signed-in actor.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError('actor_required', 'A signed-in actor is required.')
    }
    return actor
  }

  /**
   * @returns The error for a missing, malformed or foreign separation.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'separation_not_found',
      'The separation was not found.',
    )
  }

  /**
   * @returns The error for an employee who already has a separation.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'separation_exists',
      'The employee already has a separation that is not cancelled.',
    )
  }

  /**
   * @returns The error for a separation changed by someone else.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The separation was changed by someone else. Reload it and try again.',
    )
  }
}
