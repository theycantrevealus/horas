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
import { todayInZone, todayUtc } from '@utility/validation/local-date'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type FacilityRepository } from '@repository/interface/facility'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import {
  WORKFORCE_EVENTS,
  type AppointmentExpiredPayload,
} from '@repository/model/workforce-event'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_FACILITY,
  REPOSITORY_PRIVILEGE_GRANT,
} from '@repository/token'
import { flagDependents } from '../appointment/supervisor-links'
import { type HrJob, type JobPassResult } from './job'

/**
 * System actor of the job, as written in the change history.
 */
const ACTOR = 'appointment-expiry-job'

/**
 * Reason kept with each change.
 */
const REASON = 'appointment_expired'

/**
 * Sets current SPKs whose last valid day has passed to `expired` (HR spec 7.3, plan 7 WJ6). The
 * day is read in the credentialing facility's zone (UTC when it cannot be read). An `active` and a
 * `suspended` SPK both expire; `expired` is final. The grants are left as they are, because
 * eligibility reads the SPK status (`HR-CRD-001`, `HR-CRD-003`), but the supervised grants whose
 * supervisor's `full` grant stops being effective get the open flag `supervisor_lost_privilege`
 * (`HR-CRD-006`) in the same transaction, like a suspension does. Each SPK is changed in its own
 * transaction with its event and its own tenant.
 */
@Injectable()
export class AppointmentExpiryJob implements HrJob {
  readonly name = 'appointment-expiry'

  /**
   * @param appointments - Clinical appointment (SPK) repository.
   * @param grants - Privilege grant repository.
   * @param facilities - Facility repository, for the time zone.
   * @param transactions - Transaction manager of the main connection.
   * @param events - Event outbox of the main connection.
   */
  constructor(
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(EVENT_OUTBOX) private readonly events: EventOutbox,
  ) {}

  /**
   * Expires the SPKs that are due, at most `batchSize` of them. The read takes every SPK ending on
   * or before today in UTC, which includes every zone's due ones; each is then checked against
   * today in its own facility's zone and left alone when it is not due there yet.
   *
   * @param now - The current time.
   * @param batchSize - Most SPKs to change.
   * @returns What the pass did.
   */
  async run(now: Date, batchSize: number): Promise<JobPassResult> {
    const candidates = await this.appointments.findCurrentEndedOnOrBefore(
      todayUtc(now),
      batchSize,
    )
    const zones = new Map<string, string>()
    const result: JobPassResult = { count: 0, failed: 0, more: false }
    for (const appointment of candidates) {
      try {
        const zone = await this.zoneOf(appointment, zones)
        if (appointment.valid_period.end >= todayInZone(zone, now)) {
          continue
        }
        await this.expire(appointment, now)
        result.count += 1
      } catch (error: unknown) {
        result.failed += 1
        result.error = error instanceof Error ? error.name : 'UnknownError'
        result.retryable =
          error instanceof RepositoryError ? error.retryable : true
      }
    }
    result.more = result.count > 0 && candidates.length === batchSize
    return result
  }

  /**
   * Reads the time zone of the credentialing facility, once per facility in a pass.
   *
   * @param appointment - The SPK.
   * @param zones - Zones already read in this pass, by facility identifier.
   * @returns The IANA zone, or `UTC` when the facility cannot be read.
   */
  private async zoneOf(
    appointment: ClinicalAppointment,
    zones: Map<string, string>,
  ): Promise<string> {
    const key = appointment.credentialing_facility_id
    const known = zones.get(key)
    if (known !== undefined) {
      return known
    }
    const facility = await this.facilities.findOne(key)
    const zone =
      facility &&
      facility.tenant_id === appointment.tenant_id &&
      !facility.deleted_at
        ? facility.timezone
        : 'UTC'
    zones.set(key, zone)
    return zone
  }

  /**
   * Expires one SPK, flags the dependents of its full grants and announces it, in one
   * transaction. The write carries the version that was read, so an SPK changed in the meantime
   * (for example revoked) fails and is skipped.
   *
   * @param appointment - A current SPK past its last valid day.
   * @param now - The time of the pass.
   */
  private async expire(
    appointment: ClinicalAppointment,
    now: Date,
  ): Promise<void> {
    await runWithRequestContext(
      { correlationId: randomUUID(), actor: systemActor(ACTOR) },
      () =>
        withChangeReason(REASON, () =>
          this.transactions.run(async () => {
            const lost = (
              await this.grants.findByAppointment(
                appointment.tenant_id,
                appointment.id,
              )
            )
              .filter(
                (grant) =>
                  grant.condition === 'full' && grant.status === 'active',
              )
              .map((grant) => grant.id)
            const updated = await this.appointments.update(
              appointment.id,
              { status: 'expired', is_current: false },
              { expectedVersion: appointment.version },
            )
            await flagDependents(
              this.grants,
              appointment.tenant_id,
              lost,
              now,
            )
            await this.events.append(
              newEvent({
                tenantId: appointment.tenant_id,
                type: WORKFORCE_EVENTS.APPOINTMENT_EXPIRED,
                aggregate: {
                  type: 'clinical_appointment',
                  id: updated.id,
                  version: updated.version,
                },
                payload: {
                  appointment_id: updated.id,
                  employee_id: updated.employee_id,
                  credentialing_facility_id:
                    updated.credentialing_facility_id,
                  valid_until: updated.valid_period.end,
                } satisfies AppointmentExpiredPayload as unknown as Record<
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
