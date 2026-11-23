import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { RepositoryError } from '@utility/database/error'
import { systemActor } from '@utility/history/actor'
import { runWithRequestContext } from '@utility/logger/context'
import { todayInZone, todayUtc } from '@utility/validation/local-date'
import { type FacilityRepository } from '@repository/interface/facility'
import { type SeparationRepository } from '@repository/interface/separation'
import { type Separation } from '@repository/model/separation'
import { REPOSITORY_FACILITY, REPOSITORY_SEPARATION } from '@repository/token'
import { addDays } from '../assignment/assignment-rules'
import { SeparationCompletionService } from '../separation/separation-completion.service'
import { type HrJob, type JobPassResult } from './job'

/**
 * System actor of the job, as written in the change history.
 */
const ACTOR = 'separation-job'

/**
 * Separations read per page.
 */
const PAGE_SIZE = 100

/**
 * Completes the planned separations whose last working day has ended (HR spec 9.10.4.3, HR plan 9
 * SP5). The read takes every tenant's planned separation whose last day is before tomorrow in UTC,
 * which covers every time zone, and each one is rechecked in its own facility's zone (UTC when it
 * has none): a hospital east of UTC completes after its own midnight, one west of it only when its
 * day has really ended. Each separation is completed in its own request context and transaction
 * with a new correlation id; a failure is counted and the separation stays `planned`, so the next
 * pass retries it and the others are not stopped. A second pass changes nothing.
 */
@Injectable()
export class SeparationJob implements HrJob {
  readonly name = 'separation'

  /**
   * @param separations - Separation repository, for the cross-tenant read.
   * @param facilities - Facility repository, for the time zone of each separation.
   * @param completion - Completes one separation.
   */
  constructor(
    @Inject(REPOSITORY_SEPARATION)
    private readonly separations: SeparationRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(SeparationCompletionService)
    private readonly completion: SeparationCompletionService,
  ) {}

  /**
   * Completes the separations that are due, stopping once `batchSize` were completed.
   *
   * @param now - The current time.
   * @param batchSize - Most separations to complete.
   * @returns What the pass did.
   */
  async run(now: Date, batchSize: number): Promise<JobPassResult> {
    const before = addDays(todayUtc(now), 1)
    const result: JobPassResult = { count: 0, failed: 0, more: false }
    let after: string | null = null
    for (;;) {
      const page: Separation[] = await this.separations.findPlannedEndedBefore(
        before,
        after,
        PAGE_SIZE,
      )
      for (const separation of page) {
        if (!(await this.hasEnded(separation, now))) {
          continue
        }
        if (result.count >= batchSize) {
          result.more = true
          return result
        }
        try {
          await runWithRequestContext(
            { correlationId: randomUUID(), actor: systemActor(ACTOR) },
            () => this.completion.complete(separation.tenant_id, separation.id),
          )
          result.count += 1
        } catch (error: unknown) {
          result.failed += 1
          result.error = error instanceof Error ? error.name : 'UnknownError'
          result.retryable =
            error instanceof RepositoryError ? error.retryable : true
        }
      }
      if (page.length < PAGE_SIZE) {
        return result
      }
      after = page[page.length - 1]!.id
    }
  }

  /**
   * Tells whether the last working day of a separation has ended in its facility's zone.
   *
   * @param separation - The separation.
   * @param now - The current time.
   * @returns True when today there is after the last working day.
   */
  private async hasEnded(separation: Separation, now: Date): Promise<boolean> {
    const facility = separation.facility_id
      ? await this.facilities.findOne(separation.facility_id)
      : null
    const today =
      facility && facility.tenant_id === separation.tenant_id
        ? todayInZone(facility.timezone, now)
        : todayUtc(now)
    return separation.last_working_day < today
  }
}
