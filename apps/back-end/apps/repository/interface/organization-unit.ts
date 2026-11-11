import {
  type Repository,
  type UpdateOptions,
} from '@utility/database/interface'
import { type OrganizationUnit } from '@repository/model/organization-unit'

/**
 * Organization unit data access. Inject it with `REPOSITORY_ORGANIZATION_UNIT`.
 */
export interface OrganizationUnitRepository extends Repository<OrganizationUnit> {
  /**
   * Finds a unit by its code inside a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility the unit belongs to.
   * @param code - Unit code, unique inside the facility.
   * @returns The unit, or `null` when none matches.
   */
  findByCode(
    tenantId: string,
    facilityId: string,
    code: string,
  ): Promise<OrganizationUnit | null>

  /**
   * Finds the units whose parent is the given unit, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param parentId - Parent unit.
   * @returns The direct children, possibly none.
   */
  findChildren(tenantId: string, parentId: string): Promise<OrganizationUnit[]>

  /**
   * Finds every unit below a unit, at any depth (its identifier is in their `ancestor_ids`),
   * ordered by code. The unit itself is not included.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit whose subtree is read.
   * @returns The descendants, possibly none.
   */
  findDescendants(tenantId: string, unitId: string): Promise<OrganizationUnit[]>

  /**
   * Finds the units of a facility, whatever their status, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility the units belong to.
   * @param limit - Most units to return; omit for all.
   * @returns The units, possibly none.
   */
  findByFacility(
    tenantId: string,
    facilityId: string,
    limit?: number,
  ): Promise<OrganizationUnit[]>

  /**
   * Finds the active units of a facility, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility the units belong to.
   * @param limit - Most units to return; omit for all.
   * @returns The active units, possibly none.
   */
  findActiveByFacility(
    tenantId: string,
    facilityId: string,
    limit?: number,
  ): Promise<OrganizationUnit[]>

  /**
   * Moves a unit, with every unit below it, under another parent of the same facility, or to the
   * top (`null`). This is a write: the unit and each descendant get new `ancestor_ids`, one
   * change record each, in one transaction. Inside the transaction it re-reads the new parent and
   * rejects with `RepositoryConflictError` when the parent is missing, in another facility,
   * closed, the unit itself or one of its descendants, so two moves that are valid alone cannot
   * form a loop together.
   *
   * @param id - Unit to move.
   * @param newParentId - New parent, or `null` for a top unit.
   * @param options - With `expectedVersion`, rejects when the unit changed since it was read.
   * @returns The moved unit.
   */
  moveSubtree(
    id: string,
    newParentId: string | null,
    options?: UpdateOptions,
  ): Promise<OrganizationUnit>
}
