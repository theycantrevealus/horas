import { Inject, Injectable } from '@nestjs/common'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type PrivilegeCondition } from '@repository/model/common/credentialing'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import { REPOSITORY_PRIVILEGE_GRANT } from '@repository/token'

/**
 * Filters and paging of the privilege directory.
 *
 * @property catalogItemId - Only grants of this privilege.
 * @property employeeId - Only grants held by this practitioner.
 * @property status - Only grants in this status; `all` for every status. Default `active`.
 * @property condition - Only grants with this condition.
 * @property facilityId - Only grants that cover this facility.
 * @property unitId - Only grants that cover this unit.
 * @property flagged - `true`: only grants with an open flag; `false`: only grants without one.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListGrantsInput {
  catalogItemId?: string
  employeeId?: string
  status?: PrivilegeGrant['status'] | 'all'
  condition?: PrivilegeCondition
  facilityId?: string
  unitId?: string
  flagged?: boolean
  limit?: number
  offset?: number
}

/**
 * Reads of the privilege grants of the tenant: the privilege directory (HR plan 4.3, part 2).
 * A read; it writes no log entry.
 */
@Injectable()
export class GrantService {
  /**
   * @param grants - Privilege grant repository.
   */
  constructor(
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
  ) {}

  /**
   * Lists grants ordered by privilege code: who holds a privilege, with which condition. Only
   * active grants unless a status is asked for.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Filters and paging.
   * @returns The grants.
   */
  list(tenantId: string, input: ListGrantsInput): Promise<PrivilegeGrant[]> {
    const { status, ...rest } = input
    const wanted = status ?? 'active'
    return this.grants.findByFilter(tenantId, {
      ...rest,
      ...(wanted === 'all' ? {} : { status: wanted }),
    })
  }
}
