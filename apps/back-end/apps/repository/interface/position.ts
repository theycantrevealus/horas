import { type Repository } from '@utility/database/interface'
import { type Position } from '@repository/model/position'

/**
 * Position data access. Inject it with `REPOSITORY_POSITION`.
 */
export interface PositionRepository extends Repository<Position> {
  /**
   * Finds a position by its code inside a unit.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit the position belongs to.
   * @param code - Position code, unique inside the unit.
   * @returns The position, or `null` when none matches.
   */
  findByCode(
    tenantId: string,
    unitId: string,
    code: string,
  ): Promise<Position | null>

  /**
   * Finds the active positions of a unit, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit the positions belong to.
   * @param limit - Most positions to return; omit for all.
   * @returns The active positions, possibly none.
   */
  findActiveByUnit(
    tenantId: string,
    unitId: string,
    limit?: number,
  ): Promise<Position[]>

  /**
   * Finds the active head position of a unit.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit whose head position is read.
   * @returns The head position, or `null` when the unit has none.
   */
  findActiveHead(tenantId: string, unitId: string): Promise<Position | null>
}
