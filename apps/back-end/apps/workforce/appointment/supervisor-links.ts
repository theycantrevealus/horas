import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'

/**
 * Tells whether a grant can still lose or gain a supervisor flag: not revoked, not superseded.
 *
 * @param grant - The supervised grant.
 * @returns True when the grant is live or suspended.
 */
function isLive(grant: PrivilegeGrant): boolean {
  return grant.status !== 'revoked' && grant.status !== 'superseded'
}

/**
 * Raises the open flag `supervisor_lost_privilege` on a supervised grant, unless it has one.
 *
 * @param grants - Privilege grant repository.
 * @param dependent - The supervised grant.
 * @param now - The time of the decision.
 * @returns True when a flag was set.
 */
async function raiseFlag(
  grants: PrivilegeGrantRepository,
  dependent: PrivilegeGrant,
  now: Date,
): Promise<boolean> {
  if (
    !isLive(dependent) ||
    (dependent.flag !== null && dependent.flag.resolved_at === null)
  ) {
    return false
  }
  await grants.update(dependent.id, {
    flag: { reason: 'supervisor_lost_privilege', at: now, resolved_at: null },
  })
  return true
}

/**
 * Flags, with `supervisor_lost_privilege`, the supervised grants that name one of the given
 * grants as their supervisor's grant (HR-CRD-006). A grant that is revoked, superseded or already
 * has an open flag is left alone.
 *
 * @param grants - Privilege grant repository.
 * @param tenantId - Tenant of the caller.
 * @param lostGrantIds - The grants that stopped being active.
 * @param now - The time of the decision.
 * @returns The number of grants flagged.
 */
export async function flagDependents(
  grants: PrivilegeGrantRepository,
  tenantId: string,
  lostGrantIds: string[],
  now: Date,
): Promise<number> {
  let flagged = 0
  for (const lostId of lostGrantIds) {
    for (const dependent of await grants.findBySupervisorGrant(
      tenantId,
      lostId,
    )) {
      if (await raiseFlag(grants, dependent, now)) {
        flagged += 1
      }
    }
  }
  return flagged
}

/**
 * Resolves the open flags of the supervised grants that name one of the given grants.
 *
 * @param grants - Privilege grant repository.
 * @param tenantId - Tenant of the caller.
 * @param grantIds - The grants that are active again.
 * @param now - The time of the decision.
 * @returns The number of flags resolved.
 */
export async function resolveFlags(
  grants: PrivilegeGrantRepository,
  tenantId: string,
  grantIds: string[],
  now: Date,
): Promise<number> {
  let resolved = 0
  for (const grantId of grantIds) {
    for (const dependent of await grants.findBySupervisorGrant(
      tenantId,
      grantId,
    )) {
      if (dependent.flag !== null && dependent.flag.resolved_at === null) {
        await grants.update(dependent.id, {
          flag: { ...dependent.flag, resolved_at: now },
        })
        resolved += 1
      }
    }
  }
  return resolved
}

/**
 * Follows a supervisor's grant to the grant of the renewed SPK (HR plan 4.4 RN11): the supervised
 * grants of other practitioners that name an old grant are re-pointed to its replacement, or get
 * the open flag when it has none. A grant that is revoked or superseded is left alone.
 *
 * @param grants - Privilege grant repository.
 * @param tenantId - Tenant of the caller.
 * @param replacements - For each old grant, the new `full` grant of the same privilege, or
 * `null` when the renewed SPK has none.
 * @param now - The time of the decision.
 * @returns How many supervised grants were re-pointed and how many were flagged.
 */
export async function repointDependents(
  grants: PrivilegeGrantRepository,
  tenantId: string,
  replacements: ReadonlyMap<string, string | null>,
  now: Date,
): Promise<{ repointed: number; flagged: number }> {
  let repointed = 0
  let flagged = 0
  for (const [oldId, newId] of replacements) {
    for (const dependent of await grants.findBySupervisorGrant(tenantId, oldId)) {
      if (!isLive(dependent) || dependent.supervisor === null) {
        continue
      }
      if (newId !== null) {
        await grants.update(dependent.id, {
          supervisor: { ...dependent.supervisor, grant_id: newId },
        })
        repointed += 1
      } else if (await raiseFlag(grants, dependent, now)) {
        flagged += 1
      }
    }
  }
  return { repointed, flagged }
}
