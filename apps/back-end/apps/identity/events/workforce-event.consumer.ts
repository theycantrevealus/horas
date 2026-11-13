import { Inject, Injectable } from '@nestjs/common'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { type EventConsumer, type OutboxEvent } from '@utility/events/event'
import { AppLogger } from '@utility/logger/service'
import { type ProcessedEventRepository } from '@repository/interface/processed-event'
import { type EmploymentStatus } from '@repository/model/employee'
import { PROCESSED_EVENT_KEEP_DAYS } from '@repository/model/processed-event'
import {
  type EmployeeStatusChangedPayload,
  WORKFORCE_EVENTS,
} from '@repository/model/workforce-event'
import { REPOSITORY_PROCESSED_EVENT } from '@repository/token'
import { AccountLifecycleService } from './account-lifecycle.service'

/**
 * Name under which this consumer records the events it handled.
 */
export const WORKFORCE_CONSUMER_NAME = 'identity.workforce-events'

/**
 * Statuses an employee can have.
 */
const STATUSES: readonly EmploymentStatus[] = [
  'onboarding',
  'probation',
  'active',
  'suspended',
  'separated',
]

/**
 * Raised for an event of a known type whose payload is not what the emitter writes. It is a defect
 * of the emitter, not something a retry fixes, so it fails loudly and the relay stops at the event
 * (`gateway-hr-events-to-identity.md` H4): skipping it silently could leave an account unheld.
 */
export class InvalidWorkforceEventError extends Error {
  /**
   * @param eventType - Name of the event, never its payload.
   */
  constructor(eventType: string) {
    super(`The payload of ${eventType} is not valid`)
    this.name = 'InvalidWorkforceEventError'
  }
}

/**
 * Reacts to the events of the workforce (HR) context: an employee's status change places or lifts
 * the holds of the employee's account (`gateway-hr-events-to-identity.md` H5 to H9). Contract
 * events and event types it does not know are ignored (H7). Each reaction runs in one transaction
 * with the record that the event was handled, so a redelivered event does nothing the second
 * time.
 */
@Injectable()
export class WorkforceEventConsumer implements EventConsumer {
  readonly name = WORKFORCE_CONSUMER_NAME

  /**
   * @param processed - Record of the events this consumer handled.
   * @param lifecycle - Places and lifts the account holds.
   * @param transactions - Transaction manager of the main connection.
   * @param logger - Operational logger.
   */
  constructor(
    @Inject(REPOSITORY_PROCESSED_EVENT)
    private readonly processed: ProcessedEventRepository,
    @Inject(AccountLifecycleService)
    private readonly lifecycle: AccountLifecycleService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Handles one event.
   *
   * @param event - The event.
   * @throws InvalidWorkforceEventError when a status change has a bad payload.
   */
  async handle(event: OutboxEvent): Promise<void> {
    if (event.event_type !== WORKFORCE_EVENTS.EMPLOYEE_STATUS_CHANGED) {
      return
    }
    const payload = this.parse(event)
    const result = await this.transactions.run(async () => {
      if (await this.processed.findByEvent(this.name, event.event_id)) {
        return 'duplicate' as const
      }
      const outcome = await this.lifecycle.applyEmploymentStatus(
        event.tenant_id,
        payload.employee_id,
        payload.to_status,
        event.event_id,
      )
      const now = new Date()
      await this.processed.create({
        tenant_id: event.tenant_id,
        consumer: this.name,
        event_id: event.event_id,
        event_type: event.event_type,
        processed_at: now,
        expires_at: new Date(
          now.getTime() + PROCESSED_EVENT_KEEP_DAYS * 86_400_000,
        ),
      })
      return outcome
    })
    if (result === 'applied') {
      this.logger.log({
        event: 'account_lifecycle',
        operation: 'WorkforceEventConsumer.handle',
        outcome: 'success',
        eventType: event.event_type,
        toStatus: payload.to_status,
      })
    }
  }

  /**
   * Reads and checks the payload of a status change.
   *
   * @param event - The event.
   * @returns The payload.
   * @throws InvalidWorkforceEventError when it is not valid.
   */
  private parse(event: OutboxEvent): EmployeeStatusChangedPayload {
    const { payload } = event
    const employeeId = payload.employee_id
    const toStatus = payload.to_status
    const fromStatus = payload.from_status
    const date = payload.effective_date
    if (
      typeof employeeId !== 'string' ||
      employeeId === '' ||
      typeof date !== 'string' ||
      !STATUSES.includes(toStatus as EmploymentStatus) ||
      !STATUSES.includes(fromStatus as EmploymentStatus)
    ) {
      throw new InvalidWorkforceEventError(event.event_type)
    }
    return {
      employee_id: employeeId,
      from_status: fromStatus as EmploymentStatus,
      to_status: toStatus as EmploymentStatus,
      effective_date: date,
    }
  }
}
