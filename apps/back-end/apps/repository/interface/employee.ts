import { type Page, type Repository } from '@utility/database/interface'
import {
  type Employee,
  type EmploymentStatus,
} from '@repository/model/employee'

/**
 * Filters and paging of the employee search.
 *
 * @property name - Part of the display name, case-insensitive.
 * @property employeeNumber - Start of the employee number.
 * @property status - Employment status.
 * @property workforceCategoryCode - Code of the workforce category.
 * @property isClinical - Only clinical (`true`) or only non-clinical (`false`) employees.
 * @property unitId - Unit of the primary assignment.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface EmployeePageOptions {
  name?: string
  employeeNumber?: string
  status?: EmploymentStatus
  workforceCategoryCode?: string
  isClinical?: boolean
  unitId?: string
  limit?: number
  offset?: number
}

/**
 * Employee data access. Inject it with `REPOSITORY_EMPLOYEE`.
 */
export interface EmployeeRepository extends Repository<Employee> {
  /**
   * Finds an employee by number.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeNumber - Employee number, unique inside the tenant.
   * @returns The employee, or `null` when none matches.
   */
  findByNumber(
    tenantId: string,
    employeeNumber: string,
  ): Promise<Employee | null>

  /**
   * Finds the employee that holds a public registry number.
   *
   * @param tenantId - Tenant to search in.
   * @param system - Registry system, for example `id.satusehat-ihs`.
   * @param value - The number.
   * @returns The employee, or `null` when none holds it.
   */
  findByPractitionerId(
    tenantId: string,
    system: string,
    value: string,
  ): Promise<Employee | null>

  /**
   * Returns one page of employees, ordered by employee number.
   *
   * @param tenantId - Tenant to search in.
   * @param options - Filters and paging.
   * @returns The page.
   */
  findPage(
    tenantId: string,
    options: EmployeePageOptions,
  ): Promise<Page<Employee>>
}
