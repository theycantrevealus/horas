/**
 * Who is calling a leave service and what they may do. The gateway builds it from the signed-in
 * account and its permissions, so the services need no identity types (`workforce.md` 1).
 *
 * @property accountId - The signed-in account.
 * @property employeeId - The employee linked to the account, or `null`.
 * @property canRead - May read any request of the tenant (`workforce.leave-request:read`).
 * @property canReadDetails - May read the reason and proof of any request (`:read-details`).
 * @property canWrite - May request, attach proof and cancel on an employee's behalf (`:write`).
 * @property canDecide - A Head of Unit who may decide first steps (`:decide`).
 * @property canApproveHr - HR Manager: second steps, and first steps that fall to HR Manager
 * (`:approve-hr`).
 */
export interface LeaveCaller {
  accountId: string
  employeeId: string | null
  canRead: boolean
  canReadDetails: boolean
  canWrite: boolean
  canDecide: boolean
  canApproveHr: boolean
}
