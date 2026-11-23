import { Inject, Injectable } from '@nestjs/common'
import { type SeparationRepository } from '@repository/interface/separation'
import { REPOSITORY_SEPARATION } from '@repository/token'
import { InvalidRequestError } from '../workforce.error'

/**
 * Tells whether an employee is leaving, for the paths that plan people: adding an assignment,
 * importing a roster, swapping shifts, practice schedules and sessions, leave, contracts and
 * credential applications (HR plan 9 SP2, `HR-SEP-003`). A separation that is `planned` or
 * `completed` counts; a cancelled one blocks nothing. Writes no log entry (a read).
 */
@Injectable()
export class SeparationCalendar {
  /**
   * @param separations - Separation repository.
   */
  constructor(
    @Inject(REPOSITORY_SEPARATION)
    private readonly separations: SeparationRepository,
  ) {}

  /**
   * Tells whether the employee's last working day is before a date.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param date - The local date.
   * @returns True when a planned or completed separation has a last working day before the date.
   */
  async isLeavingBefore(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<boolean> {
    const separation = await this.separations.findOpenByEmployee(
      tenantId,
      employeeId,
    )
    return separation !== null && separation.last_working_day < date
  }

  /**
   * Refuses a date after the employee's last working day.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param date - The local date being planned.
   * @throws InvalidRequestError `employee_leaving`.
   */
  async assertCanPlan(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<void> {
    if (await this.isLeavingBefore(tenantId, employeeId, date)) {
      throw this.leaving()
    }
  }

  /**
   * Refuses an employee who has a planned or completed separation, whatever the date (a credential
   * application has no date to compare).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @throws InvalidRequestError `employee_leaving`.
   */
  async assertNotLeaving(tenantId: string, employeeId: string): Promise<void> {
    if (await this.separations.findOpenByEmployee(tenantId, employeeId)) {
      throw this.leaving()
    }
  }

  /**
   * @returns The error for planning after the last working day.
   */
  private leaving(): InvalidRequestError {
    return new InvalidRequestError(
      'employee_leaving',
      'The employee is leaving and cannot be planned after the last working day.',
    )
  }
}
