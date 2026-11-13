import { Inject, Injectable } from '@nestjs/common'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { systemActor } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { type AccountRepository } from '@repository/interface/account'
import { type AccountSessionRepository } from '@repository/interface/account-session'
import {
  type Account,
  type AccountHold,
  type AccountHoldReason,
} from '@repository/model/account'
import { type EmploymentStatus } from '@repository/model/employee'
import {
  REPOSITORY_ACCOUNT,
  REPOSITORY_ACCOUNT_SESSION,
} from '@repository/token'
import { deriveStatus } from '../account/account-status'
import { SecurityAuditService } from '../authentication/security-audit.service'

/**
 * Name of the system actor that places the holds, as shown in the change history.
 */
const ACTOR = 'workforce-events'

/**
 * What a reaction did.
 */
export type LifecycleResult = 'applied' | 'unchanged' | 'no_account'

/**
 * Places and lifts the account holds that follow an employee's employment status
 * (`account-and-workforce-collections.md` 6.3 and the plan `gateway-hr-events-to-identity.md` H5).
 * Holds of source `workforce` are the only ones it ever touches: a security hold, an
 * administrator's hold and a hold of another reason stay as they are, so lifting the HR suspension
 * never re-enables an account that security or an administrator held.
 */
@Injectable()
export class AccountLifecycleService {
  /**
   * @param accounts - Account repository.
   * @param sessions - Session repository, to end the sessions of a held account.
   * @param transactions - Transaction manager, so a hold, the sessions and the audit entry change together.
   * @param audit - Security log.
   */
  constructor(
    @Inject(REPOSITORY_ACCOUNT) private readonly accounts: AccountRepository,
    @Inject(REPOSITORY_ACCOUNT_SESSION)
    private readonly sessions: AccountSessionRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(SecurityAuditService) private readonly audit: SecurityAuditService,
  ) {}

  /**
   * Applies the reaction to an employee's new employment status to the employee's account, if
   * there is one: `suspended` places a `suspend` hold, `separated` places a `disable` hold (both
   * end every session), and `probation` or `active` lift the suspension hold HR placed. Every
   * change bumps the account's `authz_version`, so tokens already issued stop working at the next
   * request. Idempotent: a second call with the same status changes nothing. Call it inside the
   * transaction of the event, so the reaction and the record that the event was handled commit
   * together.
   *
   * @param tenantId - Tenant of the event.
   * @param employeeId - Employee whose status changed.
   * @param status - The employee's new status.
   * @param eventId - Event that caused the reaction, kept on the hold.
   * @returns `applied` when the account changed, `unchanged` when it already was as wanted or the
   * status needs no reaction, `no_account` when the employee has no open account.
   */
  async applyEmploymentStatus(
    tenantId: string,
    employeeId: string,
    status: EmploymentStatus,
    eventId: string,
  ): Promise<LifecycleResult> {
    if (status === 'onboarding') {
      return 'unchanged'
    }
    const account = await this.accounts.findByEmployeeId(tenantId, employeeId)
    if (!account) {
      return 'no_account'
    }
    if (account.status === 'closed') {
      return 'unchanged'
    }
    const now = new Date()
    switch (status) {
      case 'suspended':
        return this.place(
          account,
          eventId,
          now,
          'suspend',
          'employment_suspended',
        )
      case 'separated':
        return this.place(account, eventId, now, 'disable', 'employment_ended')
      default:
        return this.lift(account, now)
    }
  }

  /**
   * Places a hold of source `workforce` unless the account already has it, ends the sessions and
   * writes the security entry.
   *
   * @param account - The account.
   * @param eventId - Event that caused the hold.
   * @param now - Current time.
   * @param kind - `suspend` or `disable`.
   * @param reason - Reason code of the hold.
   * @returns The result.
   */
  private async place(
    account: Account,
    eventId: string,
    now: Date,
    kind: AccountHold['kind'],
    reason: AccountHoldReason,
  ): Promise<LifecycleResult> {
    if (
      account.holds.some((hold) => this.isWorkforceHold(hold, kind, reason))
    ) {
      return 'unchanged'
    }
    const hold: AccountHold = {
      kind,
      reason,
      source: 'workforce',
      source_ref: eventId,
      placed_by: systemActor(ACTOR),
      placed_at: now,
    }
    await this.write(
      account,
      [...account.holds, hold],
      now,
      `Hold placed by an HR event: ${kind}, ${reason}`,
    )
    await this.sessions.revokeAllOfAccount(account.id, 'hold_placed', now)
    await this.audit.record({
      type: 'account_hold_placed',
      tenantId: account.tenant_id,
      accountId: account.id,
      outcome: 'success',
      reasonCode: reason,
    })
    return 'applied'
  }

  /**
   * Lifts the suspension hold that HR placed, and nothing else.
   *
   * @param account - The account.
   * @param now - Current time.
   * @returns The result.
   */
  private async lift(account: Account, now: Date): Promise<LifecycleResult> {
    const remaining = account.holds.filter(
      (hold) => !this.isWorkforceHold(hold, 'suspend', 'employment_suspended'),
    )
    if (remaining.length === account.holds.length) {
      return 'unchanged'
    }
    await this.write(
      account,
      remaining,
      now,
      'Hold lifted by an HR event: employment_suspended',
    )
    await this.audit.record({
      type: 'account_hold_lifted',
      tenantId: account.tenant_id,
      accountId: account.id,
      outcome: 'success',
      reasonCode: 'employment_suspended',
    })
    return 'applied'
  }

  /**
   * Writes the new holds with the derived status and a bumped `authz_version`, refusing to
   * overwrite a concurrent change of the account.
   *
   * @param account - The account as read.
   * @param holds - Holds after the change.
   * @param now - Current time.
   * @param reason - Reason for the change history.
   */
  private async write(
    account: Account,
    holds: AccountHold[],
    now: Date,
    reason: string,
  ): Promise<void> {
    const status = deriveStatus(
      holds,
      account.status,
      account.last_login_at !== null,
    )
    await withChangeReason(reason, () =>
      this.accounts.update(
        account.id,
        {
          holds,
          status,
          status_changed_at:
            status === account.status ? account.status_changed_at : now,
          authz_version: account.authz_version + 1,
        },
        { expectedVersion: account.version },
      ),
    )
  }

  /**
   * Tells whether a hold is the one an HR event places for a reason.
   *
   * @param hold - A hold of the account.
   * @param kind - Kind of hold.
   * @param reason - Reason code.
   * @returns True for a `workforce` hold of that kind and reason.
   */
  private isWorkforceHold(
    hold: AccountHold,
    kind: AccountHold['kind'],
    reason: AccountHoldReason,
  ): boolean {
    return (
      hold.source === 'workforce' &&
      hold.kind === kind &&
      hold.reason === reason
    )
  }
}
