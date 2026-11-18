import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { RepositoryError } from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { EVENT_OUTBOX, type EventOutbox, newEvent } from '@utility/events/event'
import { systemActor } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { runWithRequestContext } from '@utility/logger/context'
import { todayUtc } from '@utility/validation/local-date'
import { type ProfessionalLicenseRepository } from '@repository/interface/professional-license'
import { type ProfessionalLicense } from '@repository/model/professional-license'
import {
  WORKFORCE_EVENTS,
  type LicenseExpiredPayload,
} from '@repository/model/workforce-event'
import { REPOSITORY_PROFESSIONAL_LICENSE } from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import { type HrJob, type JobPassResult } from './job'

/**
 * System actor of the job, as written in the change history.
 */
const ACTOR = 'license-expiry-job'

/**
 * Reason kept with each change.
 */
const REASON = 'license_expired'

/**
 * Sets `valid` licences whose expiry date has passed to `expired` (HR spec 6.4.4 step 1, plan 7
 * WJ5). The date is today in UTC: a licence has no facility zone. Eligibility already reads the
 * dates, so this changes the stored state to match them. Each licence is changed in its own
 * transaction with its event, with its own tenant, and is never touched again once `expired`.
 */
@Injectable()
export class LicenseExpiryJob implements HrJob {
  readonly name = 'license-expiry'

  /**
   * @param licenses - Professional licence repository.
   * @param transactions - Transaction manager of the main connection.
   * @param events - Event outbox of the main connection.
   */
  constructor(
    @Inject(REPOSITORY_PROFESSIONAL_LICENSE)
    private readonly licenses: ProfessionalLicenseRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(EVENT_OUTBOX) private readonly events: EventOutbox,
  ) {}

  /**
   * Expires the licences that are due, at most `batchSize` of them.
   *
   * @param now - The current time.
   * @param batchSize - Most licences to change.
   * @returns What the pass did.
   */
  async run(now: Date, batchSize: number): Promise<JobPassResult> {
    const due = await this.licenses.findValidExpiredBefore(
      todayUtc(now),
      batchSize,
    )
    const result: JobPassResult = { count: 0, failed: 0, more: false }
    for (const license of due) {
      try {
        await this.expire(license)
        result.count += 1
      } catch (error: unknown) {
        result.failed += 1
        result.error = error instanceof Error ? error.name : 'UnknownError'
        result.retryable =
          error instanceof RepositoryError ? error.retryable : true
      }
    }
    result.more = result.count > 0 && due.length === batchSize
    return result
  }

  /**
   * Expires one licence and announces it, in one transaction. The write carries the version that
   * was read, so a licence changed in the meantime (for example revoked) fails and is skipped.
   *
   * @param license - A `valid` licence past its expiry date.
   */
  private async expire(license: ProfessionalLicense): Promise<void> {
    const expiry = license.expiry_date
    if (expiry === null) {
      return
    }
    await runWithRequestContext(
      { correlationId: randomUUID(), actor: systemActor(ACTOR) },
      () =>
        withChangeReason(REASON, () =>
          this.transactions.run(async () => {
            const updated = await this.licenses.update(
              license.id,
              { status: 'expired', status_effective_date: addDays(expiry, 1) },
              { expectedVersion: license.version },
            )
            await this.events.append(
              newEvent({
                tenantId: license.tenant_id,
                type: WORKFORCE_EVENTS.LICENSE_EXPIRED,
                aggregate: {
                  type: 'license',
                  id: updated.id,
                  version: updated.version,
                },
                payload: {
                  license_id: updated.id,
                  employee_id: updated.employee_id,
                  eligibility_role: updated.eligibility_role,
                  expiry_date: expiry,
                } satisfies LicenseExpiredPayload as unknown as Record<
                  string,
                  unknown
                >,
              }),
            )
          }),
        ),
    )
  }
}
