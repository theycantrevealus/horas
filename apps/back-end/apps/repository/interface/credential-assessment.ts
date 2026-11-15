import { type Repository } from '@utility/database/interface'
import { type CredentialAssessment } from '@repository/model/credential-assessment'

/**
 * Credential assessment data access. Inject it with `REPOSITORY_CREDENTIAL_ASSESSMENT`.
 * Assessments are never edited or deleted. They are highly confidential: a service that reads
 * them for a caller records the access (`HR-AUD-003`).
 */
export interface CredentialAssessmentRepository extends Repository<CredentialAssessment> {
  /**
   * Finds every assessment of an application, oldest first.
   *
   * @param tenantId - Tenant to search in.
   * @param applicationId - The application.
   * @returns The assessments, possibly none.
   */
  findByApplication(
    tenantId: string,
    applicationId: string,
  ): Promise<CredentialAssessment[]>

  /**
   * Finds the assessments one assessor made of an application.
   *
   * @param tenantId - Tenant to search in.
   * @param applicationId - The application.
   * @param assessorEmployeeId - The assessor.
   * @returns The assessments, possibly none.
   */
  findByAssessor(
    tenantId: string,
    applicationId: string,
    assessorEmployeeId: string,
  ): Promise<CredentialAssessment[]>
}
