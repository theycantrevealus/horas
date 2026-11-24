import { type RosterRepository } from '@repository/interface/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'

/**
 * Cancels planned assignments of one person across rosters, with what each roster needs (HR plan
 * 8.4 LK1, HR plan 9 SP4). A `closed` roster is left alone. A `published` roster takes one new
 * revision, which the cancelled assignments carry; a `submitted` or `approved` roster loses its
 * validation, so it must be validated again before it can go on; a `draft` needs nothing more.
 * Call it inside the caller's transaction.
 *
 * @param rosters - Roster repository.
 * @param tenantId - Tenant of the caller; a roster of another tenant is left alone.
 * @param planned - The planned assignments to cancel.
 * @param cancel - Does the cancelling for the assignments that may be cancelled, with the revision
 * each carries (the named write of the caller's reason).
 * @returns The cancelled assignments.
 */
export async function cancelPlannedAssignments(
  rosters: RosterRepository,
  tenantId: string,
  planned: RosterAssignment[],
  cancel: (
    items: { id: string; revision: number }[],
  ) => Promise<RosterAssignment[]>,
): Promise<RosterAssignment[]> {
  const byRoster = new Map<string, RosterAssignment[]>()
  for (const assignment of planned) {
    byRoster.set(assignment.roster_id, [
      ...(byRoster.get(assignment.roster_id) ?? []),
      assignment,
    ])
  }
  const items: { id: string; revision: number }[] = []
  for (const [rosterId, assignments] of byRoster) {
    const roster = await rosters.findOne(rosterId)
    if (!roster || roster.tenant_id !== tenantId || roster.status === 'closed') {
      continue
    }
    let revision: number | null = null
    if (roster.status === 'published') {
      revision = roster.revision + 1
      await rosters.update(
        roster.id,
        { revision },
        { expectedVersion: roster.version },
      )
    } else if (
      (roster.status === 'submitted' || roster.status === 'approved') &&
      roster.validation !== null
    ) {
      await rosters.update(
        roster.id,
        { validation: null },
        { expectedVersion: roster.version },
      )
    }
    for (const assignment of assignments) {
      items.push({ id: assignment.id, revision: revision ?? assignment.revision })
    }
  }
  return cancel(items)
}
