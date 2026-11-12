import { type Repository } from '@utility/database/interface'
import { type EmploymentContract } from '@repository/model/employment-contract'

/**
 * Employment contract data access. Inject it with `REPOSITORY_EMPLOYMENT_CONTRACT`.
 */
export interface EmploymentContractRepository extends Repository<EmploymentContract> {
  /**
   * Finds a contract by its number inside an employer.
   *
   * @param tenantId - Tenant to search in.
   * @param organizationId - Employer.
   * @param contractNumber - Contract number, unique inside the employer.
   * @returns The contract, or `null` when none matches.
   */
  findByNumber(
    tenantId: string,
    organizationId: string,
    contractNumber: string,
  ): Promise<EmploymentContract | null>

  /**
   * Finds every contract of an employee, whatever its status, newest start first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The contracts, possibly none.
   */
  findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmploymentContract[]>

  /**
   * Finds the active contract of an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The active contract, or `null` when there is none.
   */
  findActiveByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmploymentContract | null>

  /**
   * Finds the contract that renews another one.
   *
   * @param tenantId - Tenant to search in.
   * @param previousContractId - The contract that is renewed.
   * @returns The renewal, or `null` when nothing renews it.
   */
  findRenewal(
    tenantId: string,
    previousContractId: string,
  ): Promise<EmploymentContract | null>
}
