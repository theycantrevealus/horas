import { Inject, Injectable } from '@nestjs/common'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type PracticeScheduleRepository } from '@repository/interface/practice-schedule'
import { type PracticeScheduleExceptionRepository } from '@repository/interface/practice-schedule-exception'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type RosterRepository } from '@repository/interface/roster'
import { type LeaveRequest } from '@repository/model/leave-request'
import {
  REPOSITORY_LEAVE_REQUEST,
  REPOSITORY_PRACTICE_SCHEDULE,
  REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
} from '@repository/token'
import { isoWeekday } from '../rostering/practice-schedule-rules'
import { cancelPlannedAssignments } from '../rostering/roster-cancellation'
import { type LeaveEffects } from './leave-effects'
import { LeavePlaceService } from './leave-place'

/**
 * What an approved leave does to the rosters and the polyclinic sessions of the person (HR plan 8.4
 * LK1, LK2, LK5). It implements the `LeaveEffects` port of 8.3 and runs inside the transaction of
 * the approval or the cancellation, so a failure rolls the decision back; it makes no rule check, so
 * a leave is never refused because of a roster (HR spec 9.4.4.3). Only whole days count: a half day
 * cancels nothing and blocks nothing, the Head adjusts that shift by hand. The leave type is never
 * written to a roster or an exception (`HR-LEV-041`): they name the request only.
 */
@Injectable()
export class RosterLeaveEffects implements LeaveEffects {
  /**
   * @param requests - Leave request repository, to keep the cancelled shifts on the request.
   * @param rosters - Roster repository.
   * @param rosterAssignments - Roster assignment repository.
   * @param schedules - Practice schedule repository.
   * @param exceptions - Practice schedule exception repository.
   * @param place - Finds the requester's today.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly rosterAssignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_PRACTICE_SCHEDULE)
    private readonly schedules: PracticeScheduleRepository,
    @Inject(REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION)
    private readonly exceptions: PracticeScheduleExceptionRepository,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
  ) {}

  /**
   * Cancels the person's planned shifts and polyclinic sessions on the full days of the leave, and
   * keeps the cancelled shifts on the request as the material of the cover (HR plan 8.4 LK1, LK2).
   * Past dates are cancelled the same way, as a correction by the approval.
   *
   * @param request - The approved request.
   */
  async onApproved(request: LeaveRequest): Promise<void> {
    const dates = request.days
      .filter((day) => day.count === 1)
      .map((day) => day.date)
    const cancelled = await this.cancelShifts(request, dates)
    await this.cancelSessions(request, dates)
    await this.requests.update(
      request.id,
      { cover: { cancelled_assignment_ids: cancelled, confirmed: null } },
      { expectedVersion: request.version },
    )
  }

  /**
   * Undoes the practice session exceptions of a cancelled leave dated today or later. Shifts are
   * not restored (`HR-LEV-023`); the Head plans them again by hand.
   *
   * @param request - The cancelled request.
   */
  async onCancelled(request: LeaveRequest): Promise<void> {
    await this.undoExceptions(request, () => true)
  }

  /**
   * Undoes the exceptions of a leave that was ended early for the days after its new last date, if
   * they are dated today or later. Shifts are not restored (`HR-LEV-023`).
   *
   * @param request - The shortened request.
   * @param lastDate - The last day of the leave now.
   */
  async onShortened(request: LeaveRequest, lastDate: string): Promise<void> {
    await this.undoExceptions(request, (date) => date > lastDate)
  }

  /**
   * Soft-deletes the exceptions this request made that are dated today or later and that match a
   * test; exceptions of other requests and of other tenants are never read.
   *
   * @param request - The leave request.
   * @param matches - Tells whether the date of an exception is to be undone.
   */
  private async undoExceptions(
    request: LeaveRequest,
    matches: (date: string) => boolean,
  ): Promise<void> {
    const { today } = await this.place.of(request.tenant_id, request.employee_id)
    const made = await this.exceptions.findByLeave(request.tenant_id, request.id)
    for (const exception of made) {
      if (exception.date >= today && matches(exception.date)) {
        await this.exceptions.deleteSoft(exception.id)
      }
    }
  }

  /**
   * Cancels the planned assignments of the requester on the leave days, roster by roster. A closed
   * roster is left alone. A published roster takes a new revision once, which the cancelled
   * assignments carry; a submitted or approved roster loses its validation, so it must be validated
   * again before it can go on.
   *
   * @param request - The approved request.
   * @param dates - The full leave days.
   * @returns The cancelled assignment identifiers.
   */
  private async cancelShifts(
    request: LeaveRequest,
    dates: string[],
  ): Promise<string[]> {
    if (dates.length === 0) {
      return []
    }
    const days = new Set(dates)
    const planned = (
      await this.rosterAssignments.findPlannedByEmployeeBetween(
        request.tenant_id,
        request.employee_id,
        request.period.start,
        request.period.end,
      )
    ).filter((assignment) => days.has(assignment.date))
    const cancelled = await cancelPlannedAssignments(
      this.rosters,
      request.tenant_id,
      planned,
      (items) =>
        this.rosterAssignments.cancelForLeave(
          request.tenant_id,
          items,
          request.id,
        ),
    )
    return cancelled.map((assignment) => assignment.id)
  }

  /**
   * Cancels the polyclinic sessions of the requester on the leave days. A date that already has an
   * exception, a manual one for example, is left as it is. Past dates are included.
   *
   * @param request - The approved request.
   * @param dates - The full leave days.
   */
  private async cancelSessions(
    request: LeaveRequest,
    dates: string[],
  ): Promise<void> {
    if (dates.length === 0) {
      return
    }
    const schedules = await this.schedules.findByEmployeeCovering(
      request.tenant_id,
      request.employee_id,
      request.period.start,
      request.period.end,
    )
    for (const date of dates) {
      const weekday = isoWeekday(date)
      for (const schedule of schedules) {
        if (
          schedule.day_of_week !== weekday ||
          schedule.period.start > date ||
          (schedule.period.end !== null && schedule.period.end < date)
        ) {
          continue
        }
        const existing = await this.exceptions.findByScheduleAndDate(
          request.tenant_id,
          schedule.id,
          date,
        )
        if (existing) {
          continue
        }
        await this.exceptions.create({
          tenant_id: request.tenant_id,
          schedule_id: schedule.id,
          employee_id: schedule.employee_id,
          unit_id: schedule.unit_id,
          date,
          kind: 'cancelled',
          moved_to: null,
          reason: null,
          source: { kind: 'leave', ref_id: request.id },
        })
      }
    }
  }
}
