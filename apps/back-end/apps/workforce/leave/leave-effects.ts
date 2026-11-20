import { type LeaveRequest } from '@repository/model/leave-request'

/**
 * Token of the leave effects port.
 */
export const LEAVE_EFFECTS = Symbol('LEAVE_EFFECTS')

/**
 * What an approved or cancelled leave does outside the leave ledger: group 8.4 plans cover for the
 * shifts it takes away and puts them back. The decision service calls it inside the transaction
 * that writes the decision, so a failure rolls the decision back.
 */
export interface LeaveEffects {
  /**
   * Called once when a request becomes `approved`.
   *
   * @param request - The approved request.
   */
  onApproved(request: LeaveRequest): Promise<void>

  /**
   * Called once when an `approved` request is cancelled.
   *
   * @param request - The cancelled request.
   */
  onCancelled(request: LeaveRequest): Promise<void>
}
