import { type EmploymentStatus } from './employee'

/**
 * Names of the events the workforce (HR) context publishes (`.claude/design/plans/gateway-hr-events-to-identity.md`
 * H3). Other contexts read these names and the payloads below; they never import a workforce
 * service.
 */
export const WORKFORCE_EVENTS = {
  EMPLOYEE_STATUS_CHANGED: 'workforce.employee.status_changed',
  CONTRACT_ACTIVATED: 'workforce.contract.activated',
  CONTRACT_ENDED: 'workforce.contract.ended',
  CONTRACT_TERMINATED: 'workforce.contract.terminated',
  LICENSE_EXPIRED: 'workforce.license.expired',
  APPOINTMENT_EXPIRED: 'workforce.appointment.expired',
} as const

/**
 * Name of one workforce event.
 */
export type WorkforceEventType =
  (typeof WORKFORCE_EVENTS)[keyof typeof WORKFORCE_EVENTS]

/**
 * Payload of `workforce.employee.status_changed`. Identifiers, codes and dates only: never a
 * name, number, contact or the HR reason.
 *
 * @property employee_id - The employee.
 * @property from_status - Status before the change.
 * @property to_status - Status after the change.
 * @property effective_date - Local date the new status took effect.
 */
export interface EmployeeStatusChangedPayload {
  employee_id: string
  from_status: EmploymentStatus
  to_status: EmploymentStatus
  effective_date: string
}

/**
 * Payload of `workforce.contract.activated`, `.ended` and `.terminated`.
 *
 * @property contract_id - The contract.
 * @property employee_id - The employee.
 * @property organization_id - The employer.
 */
export interface ContractEventPayload {
  contract_id: string
  employee_id: string
  organization_id: string
}

/**
 * Payload of `workforce.license.expired`, written by the licence expiry job. Identifiers, codes and
 * dates only: never a document number.
 *
 * @property license_id - The licence.
 * @property employee_id - The holder.
 * @property eligibility_role - `registration`, `practice_permit` or `null`.
 * @property expiry_date - The last day the licence was valid.
 */
export interface LicenseExpiredPayload {
  license_id: string
  employee_id: string
  eligibility_role: string | null
  expiry_date: string
}

/**
 * Payload of `workforce.appointment.expired`, written by the SPK expiry job. Identifiers and dates
 * only: never a letter number.
 *
 * @property appointment_id - The SPK.
 * @property employee_id - The practitioner.
 * @property credentialing_facility_id - The facility that issued it.
 * @property valid_until - The last day the SPK was valid.
 */
export interface AppointmentExpiredPayload {
  appointment_id: string
  employee_id: string
  credentialing_facility_id: string
  valid_until: string
}
