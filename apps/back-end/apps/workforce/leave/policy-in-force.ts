import { type LeavePolicy } from '@repository/model/leave-policy'

/**
 * Picks, for each leave type, the policy version in force on a date: the one with the latest
 * `effective_from` on or before it (HR spec 9.4.2). A type with no version that has started is left
 * out.
 *
 * @param versions - Policy versions of any types, in any order.
 * @param date - Local date.
 * @returns The versions in force, ordered by leave type code.
 */
export function versionsInForce(
  versions: LeavePolicy[],
  date: string,
): LeavePolicy[] {
  const inForce = new Map<string, LeavePolicy>()
  for (const version of versions) {
    const key = `${version.leave_type.system}|${version.leave_type.code}`
    const current = inForce.get(key)
    if (
      version.effective_from <= date &&
      (current === undefined || version.effective_from > current.effective_from)
    ) {
      inForce.set(key, version)
    }
  }
  return [...inForce.values()].sort((left, right) =>
    left.leave_type.code.localeCompare(right.leave_type.code),
  )
}
