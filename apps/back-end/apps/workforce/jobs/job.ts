/**
 * Injection token for the list of scheduled HR jobs the worker runs, in order.
 */
export const HR_JOBS = Symbol('HR_JOBS')

/**
 * What one pass of a job did.
 *
 * @property count - Records the pass changed.
 * @property failed - Records that failed and stay due; the next pass retries them.
 * @property more - True when a full batch was changed, so more records may be due.
 * @property error - Error class name of the last failure, never a message.
 * @property retryable - Whether the last failure is transient.
 */
export interface JobPassResult {
  count: number
  failed: number
  more: boolean
  error?: string
  retryable?: boolean
}

/**
 * A scheduled HR job (`.claude/design/plans/gateway-hr-7-worker-expiry-jobs.md` WJ1). A pass is
 * idempotent: it selects its work by date and state, so repeating it changes nothing. The worker's
 * runner owns the timing and the lease.
 */
export interface HrJob {
  /**
   * Stable name, used for the lease and the logs, for example `license-expiry`.
   */
  readonly name: string

  /**
   * Runs one pass over at most `batchSize` due records. A record that fails is counted and does not
   * stop the others (WJ10).
   *
   * @param now - The current time.
   * @param batchSize - Most records to change in this pass.
   * @returns What the pass did.
   */
  run(now: Date, batchSize: number): Promise<JobPassResult>
}
