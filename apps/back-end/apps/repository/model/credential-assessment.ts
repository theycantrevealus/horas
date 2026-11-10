import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type Coding } from './common/coding'
import { type PrivilegeCondition } from './common/credentialing'
import { Timestamp } from './timestamp'

/**
 * One assessor's assessment of one requested privilege. Highly confidential and read-audited
 * (`human-resource-collections.md` 4.4, `HR-AUD-003`).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property application_id - The application.
 * @property employee_id - The applicant, copied for access checks.
 * @property assessor_employee_id - The assessor.
 * @property catalog_item_id - The privilege assessed.
 * @property methods - Document review, interview, observation, logbook.
 * @property outcome - Recommended or not.
 * @property recommended_condition - Condition recommended, or `null`.
 * @property reason - Assessor's reasoning.
 * @property assessed_at - When assessed.
 * @property created_by - Who created the record.
 */
export class CredentialAssessment extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  application_id!: string
  employee_id!: string
  assessor_employee_id!: string
  catalog_item_id!: string
  methods!: Coding[]
  outcome!: 'recommended' | 'not_recommended'
  recommended_condition!: PrivilegeCondition | null
  reason!: string
  assessed_at!: Date
  created_by!: ActorRef
}
