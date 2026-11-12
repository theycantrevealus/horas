import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { EVENT_OUTBOX, type EventOutbox, newEvent } from '@utility/events/event'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { compareLocalDates, isLocalDate } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { type OrganizationRepository } from '@repository/interface/organization'
import { type Coding } from '@repository/model/common/coding'
import { type Employee } from '@repository/model/employee'
import { type EmploymentContract } from '@repository/model/employment-contract'
import {
  type ContractEventPayload,
  type WorkforceEventType,
  WORKFORCE_EVENTS,
} from '@repository/model/workforce-event'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_ORGANIZATION,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { latestEffectiveDate } from '../employee/status'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  checkContractTerms,
  isValidFte,
  normalizeContractNumber,
  type TypeRules,
} from './contract-rules'

const NAME = 'ContractService'

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  type: /(^|\.)employment-type$/,
  scheme: /(^|\.)working-time-scheme$/,
  termination: /(^|\.)termination-reason$/,
} as const

/**
 * Longest note on a termination.
 */
const MAX_NOTES = 500

/**
 * Contract dates as sent.
 *
 * @property start - First day.
 * @property end - Last day, or `null`/missing for an open-ended contract.
 */
export interface PeriodInput {
  start: string
  end?: string | null
}

/**
 * Data of a new contract.
 *
 * @property employeeId - The employee.
 * @property organizationId - Employer.
 * @property contractNumber - Number, unique per employer.
 * @property employmentType - Employment type code.
 * @property period - Contract dates.
 * @property probationEndDate - Last day of probation.
 * @property fte - Full-time equivalent; default 1.
 * @property workingTimeScheme - Working-time scheme code.
 * @property previousContractId - Contract this one renews.
 */
export interface CreateContractInput {
  employeeId: string
  organizationId: string
  contractNumber: string
  employmentType: Coding
  period: PeriodInput
  probationEndDate?: string | null
  fte?: number
  workingTimeScheme?: Coding | null
  previousContractId?: string | null
}

/**
 * Corrections to a draft contract. The employee, employer and number are not here (HR plan T1, T2).
 *
 * @property employmentType - New employment type.
 * @property period - New dates.
 * @property probationEndDate - New probation end, or `null`.
 * @property fte - New full-time equivalent.
 * @property workingTimeScheme - New scheme, or `null`.
 * @property previousContractId - New renewal link, or `null`.
 * @property version - Version the caller read.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface UpdateContractInput {
  employmentType?: Coding
  period?: PeriodInput
  probationEndDate?: string | null
  fte?: number
  workingTimeScheme?: Coding | null
  previousContractId?: string | null
  version?: number
  reason?: string
}

/**
 * Data of an activation or an end.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface LifecycleInput {
  version?: number
  reason?: string
}

/**
 * Data of a termination.
 *
 * @property date - Last day of the contract.
 * @property reason - Termination reason code.
 * @property notes - Free text.
 * @property version - Version the caller read.
 */
export interface TerminateContractInput {
  date: string
  reason: Coding
  notes?: string
  version?: number
}

/**
 * Employment contracts of a tenant. Keeps the employee's `current_employment` summary in step in
 * one transaction. Never deletes: a contract ends, is terminated or is superseded.
 */
@Injectable()
export class ContractService {
  /**
   * @param contracts - Contract repository.
   * @param employees - Employee repository, for the employee and the summary.
   * @param organizations - Organization repository, for the employer.
   * @param concepts - Code concepts, to check types, schemes and termination reasons.
   * @param transactions - Transaction manager, so a contract, the summary and the event change together.
   * @param events - Event outbox, for the contract events.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_ORGANIZATION)
    private readonly organizations: OrganizationRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(EVENT_OUTBOX) private readonly events: EventOutbox,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the contracts of an employee, newest start first. An employee of another tenant or one
   * that does not exist gives an empty list (HR plan T18). Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The contracts.
   */
  list(tenantId: string, employeeId: string): Promise<EmploymentContract[]> {
    return this.contracts.findByEmployee(tenantId, employeeId)
  }

  /**
   * Returns one contract. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Contract identifier.
   * @returns The contract.
   * @throws NotFoundError `contract_not_found` when it does not exist in the tenant.
   */
  get(tenantId: string, id: string): Promise<EmploymentContract> {
    return this.load(tenantId, id)
  }

  /**
   * Creates a draft contract.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The contract.
   * @returns The created draft.
   * @throws InvalidRequestError `invalid_contract_number`, `invalid_fte`, `invalid_employment_type`,
   * `invalid_working_time_scheme`, `unknown_code`, `code_retired`, `code_not_in_period`,
   * `invalid_period`, `end_date_required`, `invalid_probation_date`, `probation_not_allowed`,
   * `employee_not_found`, `employee_separated`, `organization_not_found`, `organization_inactive`,
   * `previous_contract_not_found`, `previous_contract_status` or `invalid_renewal_period`.
   * @throws ConflictError `contract_exists` or `contract_already_renewed`.
   */
  create(
    tenantId: string,
    input: CreateContractInput,
  ): Promise<EmploymentContract> {
    return observe(
      this.logger,
      'contract_create',
      `${NAME}.create`,
      async () => {
        const contractNumber = normalizeContractNumber(input.contractNumber)
        if (!contractNumber) {
          throw new InvalidRequestError(
            'invalid_contract_number',
            'The contract number must have 1 to 40 letters, digits, dots, hyphens, underscores or slashes.',
          )
        }
        const fte = input.fte ?? 1
        this.checkFte(fte)
        const rules = await this.checkType(tenantId, input.employmentType, true)
        const scheme = await this.checkScheme(
          tenantId,
          input.workingTimeScheme ?? null,
          true,
        )
        const period = this.checkTerms(
          input.period,
          input.probationEndDate ?? null,
          rules,
        )
        const employee = await this.employee(tenantId, input.employeeId)
        this.assertNotSeparated(employee)
        await this.assertOrganizationUsable(tenantId, input.organizationId)
        if (input.previousContractId) {
          await this.assertRenewable(
            tenantId,
            employee.id,
            input.previousContractId,
            period.start,
            null,
          )
        }
        if (
          await this.contracts.findByNumber(
            tenantId,
            input.organizationId,
            contractNumber,
          )
        ) {
          throw this.exists()
        }
        try {
          return await this.contracts.create({
            tenant_id: tenantId,
            employee_id: employee.id,
            organization_id: input.organizationId,
            contract_number: contractNumber,
            employment_type: {
              system: input.employmentType.system,
              code: input.employmentType.code,
            },
            period: { start: period.start, end: period.end },
            probation_end_date: input.probationEndDate ?? null,
            fte,
            working_time_scheme: scheme,
            status: 'draft',
            previous_contract_id: input.previousContractId ?? null,
            termination: null,
            document: null,
          })
        } catch (error: unknown) {
          // Two requests with the same number at once: the unique index decided.
          throw error instanceof RepositoryConflictError ? this.exists() : error
        }
      },
    )
  }

  /**
   * Corrects a draft contract. The new values are checked together with the unchanged ones.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Contract identifier.
   * @param input - Fields to change.
   * @returns The updated draft.
   * @throws InvalidRequestError `empty_update`, `contract_not_draft` and the validation codes of
   * `create`.
   * @throws NotFoundError `contract_not_found`.
   * @throws ConflictError `contract_already_renewed`, `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateContractInput,
  ): Promise<EmploymentContract> {
    return observe(
      this.logger,
      'contract_update',
      `${NAME}.update`,
      async () => {
        if (
          input.employmentType === undefined &&
          input.period === undefined &&
          input.probationEndDate === undefined &&
          input.fte === undefined &&
          input.workingTimeScheme === undefined &&
          input.previousContractId === undefined
        ) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const contract = await this.load(tenantId, id)
        if (contract.status !== 'draft') {
          throw new InvalidRequestError(
            'contract_not_draft',
            'Only a draft contract can be corrected.',
          )
        }
        const changes: Partial<EmploymentContract> = {}
        const type = input.employmentType ?? contract.employment_type
        const rules = await this.checkType(
          tenantId,
          type,
          input.employmentType !== undefined,
        )
        if (input.employmentType !== undefined) {
          changes.employment_type = {
            system: type.system,
            code: type.code,
          }
        }
        if (input.fte !== undefined) {
          this.checkFte(input.fte)
          changes.fte = input.fte
        }
        if (input.workingTimeScheme !== undefined) {
          changes.working_time_scheme = await this.checkScheme(
            tenantId,
            input.workingTimeScheme,
            true,
          )
        }
        const probation =
          input.probationEndDate !== undefined
            ? input.probationEndDate
            : contract.probation_end_date
        const period = this.checkTerms(
          input.period ?? contract.period,
          probation,
          rules,
        )
        if (input.period !== undefined) {
          changes.period = { start: period.start, end: period.end }
        }
        if (input.probationEndDate !== undefined) {
          changes.probation_end_date = input.probationEndDate
        }
        const previous =
          input.previousContractId !== undefined
            ? input.previousContractId
            : contract.previous_contract_id
        if (input.previousContractId !== undefined) {
          changes.previous_contract_id = input.previousContractId
        }
        if (previous) {
          await this.assertRenewable(
            tenantId,
            contract.employee_id,
            previous,
            period.start,
            contract.id,
          )
        }
        return this.write(input.reason, () =>
          this.contracts.update(contract.id, changes, {
            expectedVersion: input.version,
          }),
        )
      },
    )
  }

  /**
   * Makes a draft the employee's active contract. A renewal of the active contract supersedes it in
   * the same transaction, and the employee's `current_employment` summary is set.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Contract identifier.
   * @param input - Optional version and reason.
   * @returns The activated contract.
   * @throws InvalidRequestError `contract_not_draft`, `employee_not_found`, `employee_separated` or
   * `contract_not_started`.
   * @throws NotFoundError `contract_not_found`.
   * @throws ConflictError `active_contract_exists` or `stale_version`.
   */
  activate(
    tenantId: string,
    id: string,
    input: LifecycleInput,
  ): Promise<EmploymentContract> {
    return observe(
      this.logger,
      'contract_activate',
      `${NAME}.activate`,
      async () => {
        const contract = await this.load(tenantId, id)
        if (contract.status !== 'draft') {
          throw new InvalidRequestError(
            'contract_not_draft',
            'Only a draft contract can be activated.',
          )
        }
        const employee = await this.employee(tenantId, contract.employee_id)
        this.assertNotSeparated(employee)
        if (
          compareLocalDates(contract.period.start, latestEffectiveDate()) > 0
        ) {
          throw new InvalidRequestError(
            'contract_not_started',
            'The contract starts later than tomorrow. Activate it on its start date.',
          )
        }
        // Checked before any write, so a stale version cannot leave the old contract superseded.
        if (input.version !== undefined && input.version !== contract.version) {
          throw new ConflictError(
            'stale_version',
            'The contract was changed by someone else. Reload it and try again.',
          )
        }
        const active = await this.contracts.findActiveByEmployee(
          tenantId,
          employee.id,
        )
        if (active && active.id !== contract.previous_contract_id) {
          throw this.activeExists()
        }
        try {
          return await this.write(input.reason, () =>
            this.transactions.run(async () => {
              if (active) {
                await this.contracts.update(active.id, {
                  status: 'superseded',
                })
              }
              const activated = await this.contracts.update(
                contract.id,
                { status: 'active' },
                { expectedVersion: input.version },
              )
              await this.employees.update(employee.id, {
                current_employment: {
                  contract_id: activated.id,
                  organization_id: activated.organization_id,
                  employment_type: activated.employment_type,
                  start_date: activated.period.start,
                },
              })
              await this.announce(
                WORKFORCE_EVENTS.CONTRACT_ACTIVATED,
                activated,
              )
              return activated
            }),
          )
        } catch (error: unknown) {
          // A second contract may have been activated meanwhile: the unique index decided.
          if (
            error instanceof ConflictError &&
            error.code === 'stale_version' &&
            (await this.contracts.findActiveByEmployee(tenantId, employee.id))
          ) {
            throw this.activeExists()
          }
          throw error
        }
      },
    )
  }

  /**
   * Ends an active contract whose end date has been reached (HR plan T13).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Contract identifier.
   * @param input - Optional version and reason.
   * @returns The ended contract.
   * @throws InvalidRequestError `contract_not_active` or `contract_end_not_reached`.
   * @throws NotFoundError `contract_not_found`.
   * @throws ConflictError `stale_version`.
   */
  end(
    tenantId: string,
    id: string,
    input: LifecycleInput,
  ): Promise<EmploymentContract> {
    return observe(this.logger, 'contract_end', `${NAME}.end`, async () => {
      const contract = await this.loadActive(tenantId, id)
      if (
        contract.period.end === null ||
        compareLocalDates(contract.period.end, latestEffectiveDate()) > 0
      ) {
        throw new InvalidRequestError(
          'contract_end_not_reached',
          'The contract has no end date yet reached. End it on or after its end date, or terminate it.',
        )
      }
      return this.close(
        contract,
        input.reason,
        input.version,
        { status: 'ended' },
        WORKFORCE_EVENTS.CONTRACT_ENDED,
      )
    })
  }

  /**
   * Ends an active contract early (HR plan T13). Does not change the employee's status.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Contract identifier.
   * @param input - Last day, reason code, notes and optional version.
   * @returns The terminated contract.
   * @throws InvalidRequestError `contract_not_active`, `invalid_termination_date`,
   * `invalid_termination_notes`, `invalid_termination_reason`, `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   * @throws NotFoundError `contract_not_found`.
   * @throws ConflictError `stale_version`.
   */
  terminate(
    tenantId: string,
    id: string,
    input: TerminateContractInput,
  ): Promise<EmploymentContract> {
    return observe(
      this.logger,
      'contract_terminate',
      `${NAME}.terminate`,
      async () => {
        const contract = await this.loadActive(tenantId, id)
        if (
          !isLocalDate(input.date) ||
          compareLocalDates(input.date, contract.period.start) < 0 ||
          compareLocalDates(input.date, latestEffectiveDate()) > 0
        ) {
          throw new InvalidRequestError(
            'invalid_termination_date',
            'The last day must be a date from the start of the contract to tomorrow.',
          )
        }
        const notes = this.checkNotes(input.notes)
        if (!SYSTEMS.termination.test(input.reason.system)) {
          throw new InvalidRequestError(
            'invalid_termination_reason',
            'The reason must come from a termination-reason code system.',
          )
        }
        await this.concepts.assertActive(tenantId, input.reason)
        return this.close(
          contract,
          undefined,
          input.version,
          {
            status: 'terminated',
            termination: {
              date: input.date,
              reason: { system: input.reason.system, code: input.reason.code },
              notes,
            },
          },
          WORKFORCE_EVENTS.CONTRACT_TERMINATED,
        )
      },
    )
  }

  /**
   * Ends or terminates an active contract and clears the employee's summary when it points to the
   * contract, in one transaction.
   *
   * @param contract - The active contract.
   * @param reason - Optional reason for the change history.
   * @param version - Version the caller read.
   * @param changes - Status and termination to write.
   * @param type - Event to write in the same transaction.
   * @returns The updated contract.
   */
  private close(
    contract: EmploymentContract,
    reason: string | undefined,
    version: number | undefined,
    changes: Partial<EmploymentContract>,
    type: WorkforceEventType,
  ): Promise<EmploymentContract> {
    return this.write(reason, () =>
      this.transactions.run(async () => {
        const closed = await this.contracts.update(contract.id, changes, {
          expectedVersion: version,
        })
        const employee = await this.employees.findOne(contract.employee_id)
        if (employee?.current_employment?.contract_id === contract.id) {
          await this.employees.update(employee.id, {
            current_employment: null,
          })
        }
        await this.announce(type, closed)
        return closed
      }),
    )
  }

  /**
   * Writes a contract event into the outbox. Call it inside the transaction of the change.
   *
   * @param type - Event name.
   * @param contract - The contract after the change.
   */
  private async announce(
    type: WorkforceEventType,
    contract: EmploymentContract,
  ): Promise<void> {
    const payload: ContractEventPayload = {
      contract_id: contract.id,
      employee_id: contract.employee_id,
      organization_id: contract.organization_id,
    }
    await this.events.append(
      newEvent({
        tenantId: contract.tenant_id,
        type,
        aggregate: {
          type: 'employment_contract',
          id: contract.id,
          version: contract.version,
        },
        payload: { ...payload },
      }),
    )
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
    write: () => Promise<EmploymentContract>,
  ): Promise<EmploymentContract> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new ConflictError(
          'stale_version',
          'The contract was changed by someone else. Reload it and try again.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * Loads a contract of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Contract identifier.
   * @returns The contract.
   * @throws NotFoundError `contract_not_found`.
   */
  private async load(
    tenantId: string,
    id: string,
  ): Promise<EmploymentContract> {
    const contract = await this.contracts.findOne(id)
    if (!contract || contract.tenant_id !== tenantId) {
      throw this.notFound()
    }
    return contract
  }

  /**
   * Loads an active contract.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Contract identifier.
   * @returns The contract.
   * @throws NotFoundError `contract_not_found`.
   * @throws InvalidRequestError `contract_not_active`.
   */
  private async loadActive(
    tenantId: string,
    id: string,
  ): Promise<EmploymentContract> {
    const contract = await this.load(tenantId, id)
    if (contract.status !== 'active') {
      throw new InvalidRequestError(
        'contract_not_active',
        'Only an active contract can be ended or terminated.',
      )
    }
    return contract
  }

  /**
   * Loads an employee of the caller's tenant. A missing, malformed and foreign id give one answer.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The employee.
   * @throws InvalidRequestError `employee_not_found`.
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
    return employee
  }

  /**
   * Refuses a separated employee.
   *
   * @param employee - The employee.
   * @throws InvalidRequestError `employee_separated`.
   */
  private assertNotSeparated(employee: Employee): void {
    if (employee.employment_status === 'separated') {
      throw new InvalidRequestError(
        'employee_separated',
        'The employee has separated.',
      )
    }
  }

  /**
   * Checks the employer: it exists in the tenant, is not soft-deleted and is active (HR plan T1).
   *
   * @param tenantId - Tenant of the caller.
   * @param organizationId - Organization identifier.
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
        'The organization is inactive.',
      )
    }
  }

  /**
   * Checks that a contract can renew another: it belongs to the same employee, is active or ended,
   * started before the new one, and is not already renewed (HR plan T11).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee of the new contract.
   * @param previousId - The contract to renew.
   * @param start - Start of the new contract.
   * @param ownId - The new contract itself when it is being corrected, so its own link is fine.
   * @throws InvalidRequestError `previous_contract_not_found`, `previous_contract_status` or
   * `invalid_renewal_period`.
   * @throws ConflictError `contract_already_renewed`.
   */
  private async assertRenewable(
    tenantId: string,
    employeeId: string,
    previousId: string,
    start: string,
    ownId: string | null,
  ): Promise<void> {
    const previous = await this.contracts.findOne(previousId)
    if (
      !previous ||
      previous.tenant_id !== tenantId ||
      previous.employee_id !== employeeId
    ) {
      throw new InvalidRequestError(
        'previous_contract_not_found',
        'The contract to renew was not found for this employee.',
      )
    }
    if (previous.status !== 'active' && previous.status !== 'ended') {
      throw new InvalidRequestError(
        'previous_contract_status',
        'Only an active or ended contract can be renewed.',
      )
    }
    if (compareLocalDates(start, previous.period.start) <= 0) {
      throw new InvalidRequestError(
        'invalid_renewal_period',
        'A renewal must start after the contract it renews.',
      )
    }
    const renewal = await this.contracts.findRenewal(tenantId, previous.id)
    if (renewal && renewal.id !== ownId) {
      throw new ConflictError(
        'contract_already_renewed',
        'Another contract already renews this one.',
      )
    }
  }

  /**
   * Checks the employment type and reads what it requires and allows (HR plan T3).
   *
   * @param tenantId - Tenant of the caller.
   * @param type - Employment type code.
   * @param fresh - Whether the request sent the type, so it must also be active.
   * @returns The rules of the type.
   * @throws InvalidRequestError `invalid_employment_type`, `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   */
  private async checkType(
    tenantId: string,
    type: Coding,
    fresh: boolean,
  ): Promise<TypeRules> {
    if (!SYSTEMS.type.test(type.system)) {
      throw new InvalidRequestError(
        'invalid_employment_type',
        'The type must come from an employment-type code system, for example id.employment-type.',
      )
    }
    const concept = fresh
      ? await this.concepts.assertActive(tenantId, type)
      : await this.concepts.resolve(tenantId, type.system, type.code)
    return {
      requiresEndDate: concept?.properties?.requires_end_date === true,
      allowsProbation: concept?.properties?.allows_probation === true,
    }
  }

  /**
   * Checks the working-time scheme (HR plan T7).
   *
   * @param tenantId - Tenant of the caller.
   * @param scheme - Scheme code, or `null`.
   * @param fresh - Whether the request sent the scheme, so it must also be active.
   * @returns The cleaned scheme, or `null`.
   * @throws InvalidRequestError `invalid_working_time_scheme`, `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   */
  private async checkScheme(
    tenantId: string,
    scheme: Coding | null,
    fresh: boolean,
  ): Promise<Coding | null> {
    if (scheme === null) {
      return null
    }
    if (!SYSTEMS.scheme.test(scheme.system)) {
      throw new InvalidRequestError(
        'invalid_working_time_scheme',
        'The scheme must come from a working-time-scheme code system.',
      )
    }
    if (fresh) {
      await this.concepts.assertActive(tenantId, scheme)
    }
    return { system: scheme.system, code: scheme.code }
  }

  /**
   * Checks the dates against each other and against the type (HR plan T4 and T5).
   *
   * @param period - Dates as sent.
   * @param probationEndDate - Probation end, or `null`.
   * @param rules - Rules of the employment type.
   * @returns The cleaned period.
   * @throws InvalidRequestError with the code of `checkContractTerms`.
   */
  private checkTerms(
    period: PeriodInput,
    probationEndDate: string | null,
    rules: TypeRules,
  ): { start: string; end: string | null } {
    const cleaned = { start: period.start, end: period.end ?? null }
    const problem = checkContractTerms({ ...cleaned, probationEndDate }, rules)
    if (problem) {
      throw new InvalidRequestError(problem.code, problem.message)
    }
    return cleaned
  }

  /**
   * Checks a full-time equivalent (HR plan T6).
   *
   * @param fte - Value as sent.
   * @throws InvalidRequestError `invalid_fte`.
   */
  private checkFte(fte: number): void {
    if (!isValidFte(fte)) {
      throw new InvalidRequestError(
        'invalid_fte',
        'The full-time equivalent must be above 0 and at most 1, with at most two decimals.',
      )
    }
  }

  /**
   * Checks the notes of a termination.
   *
   * @param notes - Notes as sent.
   * @returns The trimmed notes, or `null` when none were given.
   * @throws InvalidRequestError `invalid_termination_notes`.
   */
  private checkNotes(notes: string | undefined): string | null {
    if (notes === undefined) {
      return null
    }
    const trimmed = notes.trim()
    if (trimmed.length < 1 || trimmed.length > MAX_NOTES) {
      throw new InvalidRequestError(
        'invalid_termination_notes',
        'The notes must have 1 to 500 characters.',
      )
    }
    return trimmed
  }

  /**
   * @returns The rejection for a taken contract number.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'contract_exists',
      'A contract with this number already exists for the employer.',
    )
  }

  /**
   * @returns The rejection for an employee that already has an active contract.
   */
  private activeExists(): ConflictError {
    return new ConflictError(
      'active_contract_exists',
      'The employee already has an active contract. End or terminate it, or activate a renewal of it.',
    )
  }

  /**
   * @returns The rejection for a contract that is not in the caller's tenant.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'contract_not_found',
      'The contract was not found.',
    )
  }
}
