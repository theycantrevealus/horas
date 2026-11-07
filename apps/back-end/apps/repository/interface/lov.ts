import { Repository } from '@utility/database/interface'
import { LOV } from '@repository/model/lov'

/**
 * LOV data access. Inject it with `REPOSITORY_LOV`.
 * LOV-specific queries are declared here, so their engine syntax stays inside the implementation.
 */
export interface LovRepository extends Repository<LOV> {
  /**
   * Returns the active LOVs of one group, sorted by value.
   *
   * @param groupName - Group to read.
   * @returns The group's LOVs.
   */
  findByGroup(groupName: string): Promise<LOV[]>
}
