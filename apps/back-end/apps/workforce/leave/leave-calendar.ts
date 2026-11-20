import { Inject, Injectable } from '@nestjs/common'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { REPOSITORY_LEAVE_REQUEST } from '@repository/token'

/**
 * Tells whether an employee is on approved leave on a date, for the paths that plan people: adding an
 * assignment, importing a roster, swapping shifts and moving a practice session (HR plan 8.4 LK7,
 * `HR-ROS-003`). Only an `approved` request counts, and only on a day that counts a whole day: a
 * pending request and a half day block nothing. Writes no log entry (a read).
 */
@Injectable()
export class LeaveCalendar {
  /**
   * @param requests - Leave request repository.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
  ) {}

  /**
   * Tells whether an employee is on approved leave on a whole day.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param date - The local date.
   * @returns True when an approved request covers the date with a day that counts 1.
   */
  async isOnLeave(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<boolean> {
    const approved = await this.requests.findApprovedCovering(
      tenantId,
      employeeId,
      date,
    )
    return approved.some((request) =>
      request.days.some((day) => day.date === date && day.count === 1),
    )
  }
}
