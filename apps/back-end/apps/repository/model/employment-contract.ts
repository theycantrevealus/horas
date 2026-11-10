import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod, type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { type FileRef } from './common/file-ref'
import { Timestamp } from './timestamp'

/**
 * Lifecycle of a contract.
 */
export type ContractStatus =
  'draft' | 'active' | 'ended' | 'terminated' | 'superseded'

/**
 * Early end of a contract.
 *
 * @property date - Last day of the contract.
 * @property reason - Termination reason.
 * @property notes - Free text.
 */
export interface ContractTermination {
  date: LocalDate
  reason: Coding
  notes: string | null
}

/**
 * One employment or engagement contract with one employer
 * (`account-and-workforce-collections.md` 4.3). A person may have several over time or in parallel.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee.
 * @property organization_id - Employer.
 * @property contract_number - Unique per organization.
 * @property employment_type - For example `id.employment-type|pkwt`; concept properties say whether an end date is required and probation is allowed.
 * @property period - Contract dates; `end` required for fixed-term types.
 * @property probation_end_date - Last day of probation, where the type allows it.
 * @property fte - Full-time equivalent, 1 being full time.
 * @property working_time_scheme - Selects the working-time parameters used by rostering.
 * @property status - Lifecycle status.
 * @property previous_contract_id - Contract this one renews, or `null`.
 * @property termination - Early end, or `null`.
 * @property document - Signed contract.
 * @property created_by - Who created the record.
 */
export class EmploymentContract extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  organization_id!: string
  contract_number!: string
  employment_type!: Coding
  period!: DatePeriod
  probation_end_date!: LocalDate | null
  fte!: number
  working_time_scheme!: Coding | null
  status!: ContractStatus
  previous_contract_id!: string | null
  termination!: ContractTermination | null
  document!: FileRef | null
  created_by!: ActorRef
}
