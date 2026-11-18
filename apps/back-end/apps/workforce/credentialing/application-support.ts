import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { type CommitteeMembershipRepository } from '@repository/interface/committee-membership'
import { type CredentialApplicationRepository } from '@repository/interface/credential-application'
import { type CommitteeMembership } from '@repository/model/committee-membership'
import {
  type ApplicationAssessor,
  type CommitteeRecommendation,
  type CredentialApplication,
} from '@repository/model/credential-application'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { LIMITS } from './application-rules'

/**
 * Loads an application of the caller's tenant. A missing, deleted, foreign or malformed
 * identifier all answer the same (HR plan 4.2 AP19).
 *
 * @param applications - Application repository.
 * @param tenantId - Tenant of the caller.
 * @param id - Application identifier.
 * @returns The application.
 * @throws NotFoundError `application_not_found`.
 */
export async function loadApplication(
  applications: CredentialApplicationRepository,
  tenantId: string,
  id: string,
): Promise<CredentialApplication> {
  const application = await applications.findOne(id)
  if (
    !application ||
    application.tenant_id !== tenantId ||
    application.deleted_at
  ) {
    throw new NotFoundError(
      'application_not_found',
      'The application was not found.',
    )
  }
  return application
}

/**
 * @returns The conflict for a stale version.
 */
export function staleApplication(): ConflictError {
  return new ConflictError(
    'stale_version',
    'The application was changed by someone else. Reload it and try again.',
  )
}

/**
 * @param message - What is allowed.
 * @returns The error for a move outside the status table (HR plan 4.2 AP9).
 */
export function invalidTransition(message: string): InvalidRequestError {
  return new InvalidRequestError('invalid_transition', message)
}

/**
 * Refuses a stale version before any write.
 *
 * @param application - The application as read.
 * @param version - Version the caller read.
 * @throws ConflictError `stale_version`.
 */
export function assertApplicationVersion(
  application: CredentialApplication,
  version: number | undefined,
): void {
  if (version !== undefined && version !== application.version) {
    throw staleApplication()
  }
}

/**
 * Runs a repository write, with the change reason when given, and turns repository rejections
 * into workforce errors.
 *
 * @param reason - Optional reason for the change history.
 * @param write - The repository call.
 * @returns What the call returns.
 * @throws ConflictError `stale_version`.
 * @throws NotFoundError `application_not_found`.
 */
export async function writeApplication(
  reason: string | undefined,
  write: () => Promise<CredentialApplication>,
): Promise<CredentialApplication> {
  try {
    return await (reason ? withChangeReason(reason, write) : write())
  } catch (error: unknown) {
    if (error instanceof RepositoryConflictError) {
      throw staleApplication()
    }
    if (error instanceof RepositoryNotFoundError) {
      throw new NotFoundError(
        'application_not_found',
        'The application was not found.',
      )
    }
    throw error
  }
}

/**
 * Cleans a reason: 1 to 500 characters (HR plan 4.2 AP16).
 *
 * @param raw - Reason as sent.
 * @returns The cleaned reason.
 * @throws InvalidRequestError `reason_required` or `invalid_reason`.
 */
export function cleanReason(raw: string): string {
  const reason = (raw ?? '').trim()
  if (reason.length === 0) {
    throw new InvalidRequestError('reason_required', 'A reason is required.')
  }
  if (reason.length > LIMITS.reason) {
    throw new InvalidRequestError(
      'invalid_reason',
      'The reason can have at most 500 characters.',
    )
  }
  return reason
}

/**
 * Finds the caller's active seat in the applicant's committee at the credentialing facility, in
 * any role (HR plan 4.2 AP7).
 *
 * @param memberships - Committee membership repository.
 * @param tenantId - Tenant of the caller.
 * @param callerEmployeeId - The caller's employee, or `null`.
 * @param application - The application.
 * @returns The seat, or `null` when the caller has none.
 */
export async function findSeat(
  memberships: CommitteeMembershipRepository,
  tenantId: string,
  callerEmployeeId: string | null,
  application: CredentialApplication,
): Promise<CommitteeMembership | null> {
  if (callerEmployeeId === null) {
    return null
  }
  return memberships.findActiveForEmployee(
    tenantId,
    callerEmployeeId,
    application.credentialing_facility_id,
    application.committee.code,
  )
}

/**
 * An application as shown to a caller who is not a committee member: the assessors' conflict
 * declarations and the recommendation summary are left out (HR plan 4.2 AP13, HR spec 14).
 */
export type RedactedApplication = Omit<
  CredentialApplication,
  'assessors' | 'recommendation'
> & {
  assessors: Omit<ApplicationAssessor, 'conflict_declaration'>[]
  recommendation: Omit<CommitteeRecommendation, 'summary'> | null
}

/**
 * An application as returned to a caller: whole for a committee member, redacted for others.
 */
export type ApplicationView = CredentialApplication | RedactedApplication

/**
 * Removes what only the committee may see.
 *
 * @param application - The whole application.
 * @returns The application without the declarations and the recommendation summary.
 */
export function redactApplication(
  application: CredentialApplication,
): RedactedApplication {
  const { assessors, recommendation, ...rest } = application
  return {
    ...rest,
    assessors: assessors.map(
      ({ conflict_declaration: _declaration, ...assessor }) => assessor,
    ),
    recommendation: recommendation
      ? (({ summary: _summary, ...shown }) => shown)(recommendation)
      : null,
  }
}
