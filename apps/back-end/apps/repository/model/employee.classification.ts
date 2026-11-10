import { type FieldClassification } from '@utility/history/record'
import { type Employee } from './employee'

/**
 * Sensitivity of `Employee` fields for the change log. Public and internal fields of an employee (HR spec 14): name, profession, specialty and unit are public inside the hospital; the rest is internal.
 */
export const EmployeeClassification: FieldClassification<Employee> = {
  default: 'internal',
  fields: {
    name: 'public',
    other_names: 'public',
    display_name: 'public',
    workforce_category: 'public',
    is_clinical: 'public',
    profession: 'public',
    specialties: 'public',
    primary_assignment: 'public',
    photo: 'public',
  },
  arrayKeys: {
    practitioner_ids: ['system'],
    work_contacts: ['system', 'value'],
  },
}
