/**
 * Injection token for the job lease of the main connection.
 */
export const JOB_LEASE = Symbol('JOB_LEASE')

/**
 * Lets one worker instance at a time run a scheduled job (`gateway-hr-7-worker-expiry-jobs.md`
 * WJ3). Not business data: it is not recorded in the change history. Implementations reject only
 * with `RepositoryError` subclasses.
 */
export interface JobLease {
  /**
   * Takes or renews the lease of a job.
   *
   * @param job - Stable job name, for example `license-expiry`.
   * @param owner - Unique name of the worker instance.
   * @param leaseMs - How long the lease lasts unless renewed.
   * @returns `true` when `owner` holds the lease.
   */
  acquire(job: string, owner: string, leaseMs: number): Promise<boolean>
}
