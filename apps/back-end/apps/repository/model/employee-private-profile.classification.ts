import { type FieldClassification } from '@utility/history/record'
import { type EmployeePrivateProfile } from './employee-private-profile'

/**
 * Sensitivity of `EmployeePrivateProfile` fields for the change log. Every field of the private profile is confidential (HR spec 14). Identifier and bank values are already masked before they reach the change log.
 */
export const EmployeePrivateProfileClassification: FieldClassification<EmployeePrivateProfile> =
  {
    default: 'confidential',
    arrayKeys: {
      identifiers: ['system'],
      personal_contacts: ['system', 'value'],
      addresses: ['use'],
      bank_accounts: ['account_number_masked'],
      tax_profile: ['effective_date'],
    },
  }
