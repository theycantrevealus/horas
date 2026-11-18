/**
 * Injection token for the LOV repository.
 * It names no database engine, so consumers don't depend on how LOV is stored.
 */
export const REPOSITORY_LOV = Symbol('REPOSITORY_LOV')

/**
 * Injection token for the account repository (identity context).
 */
export const REPOSITORY_ACCOUNT = Symbol('REPOSITORY_ACCOUNT')

/**
 * Injection token for the account credential repository. Only the authentication service uses it.
 */
export const REPOSITORY_ACCOUNT_CREDENTIAL = Symbol(
  'REPOSITORY_ACCOUNT_CREDENTIAL',
)

/**
 * Injection token for the account session repository. Only the authentication service uses it.
 */
export const REPOSITORY_ACCOUNT_SESSION = Symbol('REPOSITORY_ACCOUNT_SESSION')

/**
 * Injection token for the security event repository.
 */
export const REPOSITORY_SECURITY_EVENT = Symbol('REPOSITORY_SECURITY_EVENT')

/**
 * Injection token for the role repository.
 */
export const REPOSITORY_ROLE = Symbol('REPOSITORY_ROLE')

/**
 * Injection token for the account role binding repository.
 */
export const REPOSITORY_ACCOUNT_ROLE_BINDING = Symbol(
  'REPOSITORY_ACCOUNT_ROLE_BINDING',
)

/**
 * Injection token for the organization repository (HR legal employers).
 */
export const REPOSITORY_ORGANIZATION = Symbol('REPOSITORY_ORGANIZATION')

/**
 * Injection token for the facility repository (HR hospital and clinic sites).
 */
export const REPOSITORY_FACILITY = Symbol('REPOSITORY_FACILITY')

/**
 * Injection token for the organization unit repository (HR organization chart).
 */
export const REPOSITORY_ORGANIZATION_UNIT = Symbol(
  'REPOSITORY_ORGANIZATION_UNIT',
)

/**
 * Injection token for the code concept repository (HR code systems).
 */
export const REPOSITORY_CODE_CONCEPT = Symbol('REPOSITORY_CODE_CONCEPT')

/**
 * Injection token for the position repository (HR jobs in organization units).
 */
export const REPOSITORY_POSITION = Symbol('REPOSITORY_POSITION')

/**
 * Injection token for the HR parameter repository (scoped, dated HR settings).
 */
export const REPOSITORY_HR_PARAMETER = Symbol('REPOSITORY_HR_PARAMETER')

/**
 * Injection token for the employee repository (public and internal HR records of people).
 */
export const REPOSITORY_EMPLOYEE = Symbol('REPOSITORY_EMPLOYEE')

/**
 * Injection token for the employee private profile repository (confidential personal data).
 */
export const REPOSITORY_EMPLOYEE_PRIVATE_PROFILE = Symbol(
  'REPOSITORY_EMPLOYEE_PRIVATE_PROFILE',
)

/**
 * Injection token for the employment contract repository (HR contracts of employees).
 */
export const REPOSITORY_EMPLOYMENT_CONTRACT = Symbol(
  'REPOSITORY_EMPLOYMENT_CONTRACT',
)

/**
 * Injection token for the processed event repository (events a consumer already handled).
 */
export const REPOSITORY_PROCESSED_EVENT = Symbol('REPOSITORY_PROCESSED_EVENT')

/**
 * Injection token for the position assignment repository (who holds which position).
 */
export const REPOSITORY_POSITION_ASSIGNMENT = Symbol(
  'REPOSITORY_POSITION_ASSIGNMENT',
)

/**
 * Injection token for the committee membership repository (who sits on a facility's committees).
 */
export const REPOSITORY_COMMITTEE_MEMBERSHIP = Symbol(
  'REPOSITORY_COMMITTEE_MEMBERSHIP',
)

/**
 * Injection token for the professional license repository (STR, SIP and other licences).
 */
export const REPOSITORY_PROFESSIONAL_LICENSE = Symbol(
  'REPOSITORY_PROFESSIONAL_LICENSE',
)

/**
 * Injection token for the CPD record repository (SKP, CME and CPD credit records).
 */
export const REPOSITORY_CPD_RECORD = Symbol('REPOSITORY_CPD_RECORD')

/**
 * Injection token for the CPD summary repository (latest known credit totals).
 */
export const REPOSITORY_CPD_SUMMARY = Symbol('REPOSITORY_CPD_SUMMARY')

/**
 * Injection token for the privilege catalog repository (the clinical privileges that can be requested).
 */
export const REPOSITORY_PRIVILEGE_CATALOG = Symbol(
  'REPOSITORY_PRIVILEGE_CATALOG',
)

/**
 * Injection token for the credential application repository (requests for clinical privileges).
 */
export const REPOSITORY_CREDENTIAL_APPLICATION = Symbol(
  'REPOSITORY_CREDENTIAL_APPLICATION',
)

/**
 * Injection token for the credential assessment repository (assessors' findings on one
 * requested privilege).
 */
export const REPOSITORY_CREDENTIAL_ASSESSMENT = Symbol(
  'REPOSITORY_CREDENTIAL_ASSESSMENT',
)

/**
 * Injection token for the clinical appointment repository (SPK, the Director's letter).
 */
export const REPOSITORY_CLINICAL_APPOINTMENT = Symbol(
  'REPOSITORY_CLINICAL_APPOINTMENT',
)

/**
 * Injection token for the privilege grant repository (lines of the RKK attached to an SPK).
 */
export const REPOSITORY_PRIVILEGE_GRANT = Symbol('REPOSITORY_PRIVILEGE_GRANT')

/**
 * Injection token for the shift definition repository (the shifts a facility uses in rosters).
 */
export const REPOSITORY_SHIFT_DEFINITION = Symbol(
  'REPOSITORY_SHIFT_DEFINITION',
)

/**
 * Injection token for the holiday calendar repository (public holidays per calendar and year).
 */
export const REPOSITORY_HOLIDAY_CALENDAR = Symbol(
  'REPOSITORY_HOLIDAY_CALENDAR',
)

/**
 * Injection token for the HR import repository (file imports of rosters and holiday calendars).
 */
export const REPOSITORY_HR_IMPORT = Symbol('REPOSITORY_HR_IMPORT')

/**
 * Injection token for the coverage requirement repository (minimum staffing per unit and shift).
 */
export const REPOSITORY_COVERAGE_REQUIREMENT = Symbol(
  'REPOSITORY_COVERAGE_REQUIREMENT',
)

/**
 * Injection token for the roster repository (the plan of one unit for one period).
 */
export const REPOSITORY_ROSTER = Symbol('REPOSITORY_ROSTER')

/**
 * Injection token for the roster assignment repository (one person, one shift, one date).
 */
export const REPOSITORY_ROSTER_ASSIGNMENT = Symbol(
  'REPOSITORY_ROSTER_ASSIGNMENT',
)

/**
 * Injection token for the shift swap request repository (a request to trade or hand over a shift).
 */
export const REPOSITORY_SHIFT_SWAP_REQUEST = Symbol(
  'REPOSITORY_SHIFT_SWAP_REQUEST',
)

/**
 * Injection token for the practice schedule repository (a doctor's recurring weekly outpatient session).
 */
export const REPOSITORY_PRACTICE_SCHEDULE = Symbol(
  'REPOSITORY_PRACTICE_SCHEDULE',
)

/**
 * Injection token for the practice schedule exception repository (a cancelled or moved session).
 */
export const REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION = Symbol(
  'REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION',
)

/**
 * Injection token of the leave policy repository.
 */
export const REPOSITORY_LEAVE_POLICY = Symbol('REPOSITORY_LEAVE_POLICY')
