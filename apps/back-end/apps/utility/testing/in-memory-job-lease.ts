import { type JobLease } from '@utility/jobs/lease'

/**
 * Job lease kept in memory, for tests. It behaves like the Mongo lease: the owner can renew, and
 * another owner takes it only after it expired.
 */
export class InMemoryJobLease implements JobLease {
  private readonly leases = new Map<string, { owner: string; expiresAt: number }>()

  /**
   * Takes or renews the lease of a job.
   *
   * @param job - Job name.
   * @param owner - Instance name.
   * @param leaseMs - Lease duration.
   * @returns `true` when `owner` holds the lease.
   */
  async acquire(job: string, owner: string, leaseMs: number): Promise<boolean> {
    const now = Date.now()
    const current = this.leases.get(job)
    if (current && current.owner !== owner && current.expiresAt > now) {
      return false
    }
    this.leases.set(job, { owner, expiresAt: now + leaseMs })
    return true
  }
}
