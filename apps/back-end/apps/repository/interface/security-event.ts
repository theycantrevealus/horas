import { type Repository } from '@utility/database/interface'
import { type SecurityEvent } from '@repository/model/security-event'

/**
 * Security event data access. Inject it with `REPOSITORY_SECURITY_EVENT`.
 * Events are append-only: use `create` and the queries of `Repository`; update and delete are rejected.
 */
export type SecurityEventRepository = Repository<SecurityEvent>
