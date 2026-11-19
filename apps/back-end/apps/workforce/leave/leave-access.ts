import { type LeaveRequest } from '@repository/model/leave-request'
import { NotFoundError } from '../workforce.error'
import { type LeaveDeciderService } from './decider'
import { type LeaveCaller } from './leave-caller'

/**
 * Tells whether the caller is the employee who made the request.
 *
 * @param caller - The caller.
 * @param request - The request.
 * @returns True when the caller's employee is the requester.
 */
export function isRequester(caller: LeaveCaller, request: LeaveRequest): boolean {
  return caller.employeeId !== null && caller.employeeId === request.employee_id
}

/**
 * Tells whether the caller is the Head who decides the first step of the request now: the current
 * Head of the stored unit, so a Head appointed after the request was made counts and the former Head
 * does not (HR plan 8.3 LR6).
 *
 * @param decider - The decider service.
 * @param tenantId - Tenant of the caller.
 * @param caller - The caller.
 * @param request - The request.
 * @returns True when the caller's employee is that Head.
 */
export async function isFirstDecider(
  decider: LeaveDeciderService,
  tenantId: string,
  caller: LeaveCaller,
  request: LeaveRequest,
): Promise<boolean> {
  if (caller.employeeId === null) {
    return false
  }
  const first = await decider.resolve(tenantId, request.deciders.first)
  return first.employeeId === caller.employeeId
}

/**
 * The answer for a request that is missing, malformed, of another tenant, or that the caller may
 * not see: one answer, so nothing leaks about leave (a confidential record).
 *
 * @returns The not-found error.
 */
export function leaveRequestNotFound(): NotFoundError {
  return new NotFoundError(
    'leave_request_not_found',
    'The leave request was not found.',
  )
}
