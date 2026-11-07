import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { AuthConfig } from '@configuration/auth'
import { systemActor } from '@utility/history/actor'
import {
  getRequestContext,
  runWithRequestContext,
} from '@utility/logger/context'
import { type SecurityEventRepository } from '@repository/interface/security-event'
import { type SecurityEventType } from '@repository/model/security-event'
import { REPOSITORY_SECURITY_EVENT } from '@repository/token'
import { type ClientInfo, sha256Hex } from './client-info'

/**
 * One authentication event to record.
 *
 * @property type - Event kind.
 * @property tenantId - Tenant of the event.
 * @property accountId - Account involved, or `null` when no account matched.
 * @property outcome - `success` or `failure`.
 * @property reasonCode - Machine-readable reason of a failure. Never the attempted password or identifier.
 * @property client - Calling client, when known.
 */
export interface SecurityEventInput {
  type: SecurityEventType
  tenantId: string
  accountId: string | null
  outcome: 'success' | 'failure'
  reasonCode?: string
  client?: ClientInfo
}

/**
 * Writes authentication events to the security log (`security_events`), kept apart from the
 * business audit trail because of volume and retention.
 */
@Injectable()
export class SecurityAuditService {
  /**
   * @param events - Security event repository.
   * @param config - Typed `auth` configuration, for the retention period.
   */
  constructor(
    @Inject(REPOSITORY_SECURITY_EVENT)
    private readonly events: SecurityEventRepository,
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
  ) {}

  /**
   * Records one event. The actor is the one in the request context, or the
   * `authentication` system actor when nobody is signed in yet.
   *
   * @param input - The event.
   */
  async record(input: SecurityEventInput): Promise<void> {
    const now = new Date()
    const context = getRequestContext() ?? { correlationId: randomUUID() }
    const retentionMs = this.config.securityEventRetentionDays * 86_400_000
    await runWithRequestContext(
      { ...context, actor: context.actor ?? systemActor('authentication') },
      () =>
        this.events.create({
          tenant_id: input.tenantId,
          account_id: input.accountId,
          type: input.type,
          occurred_at: now,
          ip: input.client?.ip ?? null,
          user_agent_hash: input.client?.userAgent
            ? sha256Hex(input.client.userAgent)
            : null,
          correlation_id: context.correlationId,
          outcome: input.outcome,
          reason_code: input.reasonCode ?? null,
          expires_at: new Date(now.getTime() + retentionMs),
        }),
    )
  }
}
