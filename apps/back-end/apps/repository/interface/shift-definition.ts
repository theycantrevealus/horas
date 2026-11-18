import { type Repository } from '@utility/database/interface'
import {
  type ShiftDefinition,
  type ShiftType,
} from '@repository/model/shift-definition'

/**
 * Filters and paging of the shift list.
 *
 * @property facilityId - Only shifts of this facility.
 * @property status - Only shifts in this status.
 * @property type - Only shifts of this kind.
 * @property allowsUnitId - Only shifts this unit may use: the shift lists the unit or lists none.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface ShiftQuery {
  facilityId?: string
  status?: ShiftDefinition['status']
  type?: ShiftType
  allowsUnitId?: string
  limit?: number
  offset?: number
}

/**
 * Shift definition data access. Inject it with `REPOSITORY_SHIFT_DEFINITION`. Shifts are never
 * deleted: a shift that is no longer used is retired.
 */
export interface ShiftDefinitionRepository extends Repository<ShiftDefinition> {
  /**
   * Finds a shift by its code in a facility, retired shifts included.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param code - Shift code.
   * @returns The shift, or `null` when there is none.
   */
  findByCode(
    tenantId: string,
    facilityId: string,
    code: string,
  ): Promise<ShiftDefinition | null>

  /**
   * Finds shifts, ordered by facility and code.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The shifts, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: ShiftQuery,
  ): Promise<ShiftDefinition[]>
}
