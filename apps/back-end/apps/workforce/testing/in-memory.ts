import { RepositoryConflictError } from '@utility/database/error'
import { type NewEntity, type UpdateOptions } from '@utility/database/interface'
import { InMemoryRepository } from '@utility/testing/in-memory-repository'
import { type CodeConceptRepository } from '@repository/interface/code-concept'
import { type FacilityRepository } from '@repository/interface/facility'
import { type PositionRepository } from '@repository/interface/position'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type OrganizationRepository } from '@repository/interface/organization'
import { type CodeConcept } from '@repository/model/code-concept'
import { type Facility } from '@repository/model/facility'
import { type Organization } from '@repository/model/organization'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Position } from '@repository/model/position'

/**
 * In-memory organization repository for tests. Follows the Mongo unique index on tenant and code.
 */
export class InMemoryOrganizations
  extends InMemoryRepository<Organization>
  implements OrganizationRepository
{
  /**
   * Creates an organization, refusing a second one with the same tenant and code.
   *
   * @param entity - Organization data.
   * @param id - Optional identifier.
   * @returns The stored organization.
   */
  override async create(
    entity: NewEntity<Organization>,
    id?: string,
  ): Promise<Organization> {
    const duplicate = [...this.items.values()].some(
      (item) =>
        item.tenant_id === entity.tenant_id && item.code === entity.code,
    )
    if (duplicate) {
      throw new RepositoryConflictError('duplicate code', {
        operation: 'OrganizationRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds an organization by tenant and code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Organization code.
   * @returns The organization, or `null`.
   */
  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<Organization | null> {
    const found = [...this.items.values()].find(
      (item) => item.tenant_id === tenantId && item.code === code,
    )
    return found ? structuredClone(found) : null
  }
}

/**
 * In-memory facility repository for tests. Follows the Mongo unique index on tenant and code.
 */
export class InMemoryFacilities
  extends InMemoryRepository<Facility>
  implements FacilityRepository
{
  /**
   * Creates a facility, refusing a second one with the same tenant and code.
   *
   * @param entity - Facility data.
   * @param id - Optional identifier.
   * @returns The stored facility.
   */
  override async create(
    entity: NewEntity<Facility>,
    id?: string,
  ): Promise<Facility> {
    const duplicate = [...this.items.values()].some(
      (item) =>
        item.tenant_id === entity.tenant_id && item.code === entity.code,
    )
    if (duplicate) {
      throw new RepositoryConflictError('duplicate code', {
        operation: 'FacilityRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds a facility by tenant and code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Facility code.
   * @returns The facility, or `null`.
   */
  async findByCode(tenantId: string, code: string): Promise<Facility | null> {
    const found = [...this.items.values()].find(
      (item) => item.tenant_id === tenantId && item.code === code,
    )
    return found ? structuredClone(found) : null
  }

  /**
   * Finds the active facilities of an organization.
   *
   * @param tenantId - Tenant to search in.
   * @param organizationId - Organization that runs the facilities.
   * @returns The active, not soft-deleted facilities.
   */
  async findActiveByOrganization(
    tenantId: string,
    organizationId: string,
  ): Promise<Facility[]> {
    return [...this.items.values()]
      .filter(
        (item) =>
          item.tenant_id === tenantId &&
          item.organization_id === organizationId &&
          item.status === 'active' &&
          !item.deleted_at,
      )
      .map((item) => structuredClone(item))
  }
}

/**
 * In-memory code concept repository for tests. Follows the Mongo unique index on tenant, system
 * and code; a concept without a tenant is platform-wide.
 */
export class InMemoryCodeConcepts
  extends InMemoryRepository<CodeConcept>
  implements CodeConceptRepository
{
  /**
   * Creates a concept, refusing a second one with the same tenant, system and code.
   *
   * @param entity - Concept data; without `tenant_id` it is platform-wide.
   * @param id - Optional identifier.
   * @returns The stored concept.
   */
  override async create(
    entity: NewEntity<CodeConcept>,
    id?: string,
  ): Promise<CodeConcept> {
    const duplicate = [...this.items.values()].some(
      (item) =>
        item.tenant_id === entity.tenant_id &&
        item.system === entity.system &&
        item.code === entity.code,
    )
    if (duplicate) {
      throw new RepositoryConflictError('duplicate concept', {
        operation: 'CodeConceptRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds the concept a tenant sees for a code: its own, otherwise the platform-wide one.
   *
   * @param tenantId - Tenant that asks.
   * @param system - Code system.
   * @param code - Code inside the system.
   * @returns The concept, or `null`.
   */
  async findByCode(
    tenantId: string,
    system: string,
    code: string,
  ): Promise<CodeConcept | null> {
    return (
      (await this.findOwn(tenantId, system, code)) ??
      this.pick(
        (item) =>
          item.tenant_id === undefined &&
          item.system === system &&
          item.code === code,
      )
    )
  }

  /**
   * Finds the concept the tenant itself owns for a code.
   *
   * @param tenantId - Tenant that owns the concept.
   * @param system - Code system.
   * @param code - Code inside the system.
   * @returns The tenant's concept, or `null`.
   */
  async findOwn(
    tenantId: string,
    system: string,
    code: string,
  ): Promise<CodeConcept | null> {
    return this.pick(
      (item) =>
        item.tenant_id === tenantId &&
        item.system === system &&
        item.code === code,
    )
  }

  /**
   * Finds every concept of a system that a tenant can see, ordered by code.
   *
   * @param tenantId - Tenant that asks.
   * @param system - Code system.
   * @returns The tenant and platform concepts.
   */
  async findBySystem(tenantId: string, system: string): Promise<CodeConcept[]> {
    return [...this.items.values()]
      .filter(
        (item) =>
          !item.deleted_at &&
          item.system === system &&
          (item.tenant_id === tenantId || item.tenant_id === undefined),
      )
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((item) => structuredClone(item))
  }

  /**
   * Returns the first stored concept that matches, hiding soft-deleted ones.
   *
   * @param match - Test for a concept.
   * @returns A copy of the concept, or `null`.
   */
  private pick(match: (item: CodeConcept) => boolean): CodeConcept | null {
    const found = [...this.items.values()].find(
      (item) => !item.deleted_at && match(item),
    )
    return found ? structuredClone(found) : null
  }
}

/**
 * In-memory organization unit repository for tests. Follows the Mongo unique index on tenant,
 * facility and code, and the rules of `moveSubtree`.
 */
export class InMemoryOrganizationUnits
  extends InMemoryRepository<OrganizationUnit>
  implements OrganizationUnitRepository
{
  /**
   * Creates a unit, refusing a second one with the same tenant, facility and code.
   *
   * @param entity - Unit data.
   * @param id - Optional identifier.
   * @returns The stored unit.
   */
  override async create(
    entity: NewEntity<OrganizationUnit>,
    id?: string,
  ): Promise<OrganizationUnit> {
    const duplicate = [...this.items.values()].some(
      (item) =>
        item.tenant_id === entity.tenant_id &&
        item.facility_id === entity.facility_id &&
        item.code === entity.code,
    )
    if (duplicate) {
      throw new RepositoryConflictError('duplicate code', {
        operation: 'OrganizationUnitRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds a unit by tenant, facility and code.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility of the unit.
   * @param code - Unit code.
   * @returns The unit, or `null`.
   */
  async findByCode(
    tenantId: string,
    facilityId: string,
    code: string,
  ): Promise<OrganizationUnit | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.facility_id === facilityId &&
        item.code === code &&
        !item.deleted_at,
    )
  }

  /**
   * Finds the direct children of a unit, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param parentId - Parent unit.
   * @returns The children.
   */
  async findChildren(
    tenantId: string,
    parentId: string,
  ): Promise<OrganizationUnit[]> {
    return this.sorted(
      (item) => item.tenant_id === tenantId && item.parent_id === parentId,
    )
  }

  /**
   * Finds every unit below a unit, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit whose subtree is read.
   * @returns The descendants.
   */
  async findDescendants(
    tenantId: string,
    unitId: string,
  ): Promise<OrganizationUnit[]> {
    return this.sorted(
      (item) =>
        item.tenant_id === tenantId && item.ancestor_ids.includes(unitId),
    )
  }

  /**
   * Finds the units of a facility, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility of the units.
   * @param limit - Most units to return.
   * @returns The units.
   */
  async findByFacility(
    tenantId: string,
    facilityId: string,
    limit?: number,
  ): Promise<OrganizationUnit[]> {
    return this.sorted(
      (item) => item.tenant_id === tenantId && item.facility_id === facilityId,
      limit,
    )
  }

  /**
   * Finds the active units of a facility, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility of the units.
   * @param limit - Most units to return.
   * @returns The active units.
   */
  async findActiveByFacility(
    tenantId: string,
    facilityId: string,
    limit?: number,
  ): Promise<OrganizationUnit[]> {
    return this.sorted(
      (item) =>
        item.tenant_id === tenantId &&
        item.facility_id === facilityId &&
        item.status === 'active',
      limit,
    )
  }

  /**
   * Moves a unit with its subtree, with the same rules as the Mongo implementation. Every unit
   * is checked before any is written, so a rejected move changes nothing.
   *
   * @param id - Unit to move.
   * @param newParentId - New parent, or `null`.
   * @param options - Optional concurrency check.
   * @returns The moved unit.
   */
  async moveSubtree(
    id: string,
    newParentId: string | null,
    options?: UpdateOptions,
  ): Promise<OrganizationUnit> {
    const operation = 'OrganizationUnitRepository.moveSubtree'
    const unit = this.items.get(id)
    if (!unit || unit.deleted_at) {
      throw new Error(`not found: ${id}`)
    }
    const changed = () =>
      new RepositoryConflictError('the organization chart changed', {
        operation,
      })
    if (
      options?.expectedVersion !== undefined &&
      options.expectedVersion !== unit.version
    ) {
      throw changed()
    }
    let ancestors: string[] = []
    if (newParentId !== null) {
      const parent = this.items.get(newParentId)
      if (
        !parent ||
        parent.deleted_at ||
        parent.tenant_id !== unit.tenant_id ||
        parent.facility_id !== unit.facility_id ||
        parent.status !== 'active' ||
        parent.id === unit.id ||
        parent.ancestor_ids.includes(unit.id)
      ) {
        throw changed()
      }
      ancestors = [...parent.ancestor_ids, parent.id]
    }
    const now = new Date()
    const descendants = [...this.items.values()].filter(
      (item) =>
        item.tenant_id === unit.tenant_id &&
        !item.deleted_at &&
        item.ancestor_ids.includes(unit.id),
    )
    for (const descendant of descendants) {
      const position = descendant.ancestor_ids.indexOf(unit.id)
      this.items.set(descendant.id, {
        ...descendant,
        ancestor_ids: [
          ...ancestors,
          ...descendant.ancestor_ids.slice(position),
        ],
        version: descendant.version + 1,
        updated_at: now,
      })
    }
    const moved = {
      ...unit,
      parent_id: newParentId,
      ancestor_ids: ancestors,
      version: unit.version + 1,
      updated_at: now,
    }
    this.items.set(id, moved)
    return structuredClone(moved)
  }

  /**
   * Lists the matching, not soft-deleted units ordered by code.
   *
   * @param match - Test for a unit.
   * @param limit - Most units to return.
   * @returns Copies of the units.
   */
  private sorted(
    match: (item: OrganizationUnit) => boolean,
    limit?: number,
  ): OrganizationUnit[] {
    return this.filter((item) => !item.deleted_at && match(item))
      .sort((left, right) => left.code.localeCompare(right.code))
      .slice(0, limit)
  }
}

/**
 * In-memory position repository for tests. Follows the Mongo unique index on tenant, unit and
 * code, and the partial unique index of one active head position per unit.
 */
export class InMemoryPositions
  extends InMemoryRepository<Position>
  implements PositionRepository
{
  /**
   * Creates a position, refusing a second one with the same tenant, unit and code, or a second
   * active head position in a unit.
   *
   * @param entity - Position data.
   * @param id - Optional identifier.
   * @returns The stored position.
   */
  override async create(
    entity: NewEntity<Position>,
    id?: string,
  ): Promise<Position> {
    const items = [...this.items.values()]
    const duplicate = items.some(
      (item) =>
        item.tenant_id === entity.tenant_id &&
        item.unit_id === entity.unit_id &&
        item.code === entity.code,
    )
    const secondHead =
      entity.is_head_of_unit &&
      entity.status === 'active' &&
      items.some(
        (item) =>
          item.tenant_id === entity.tenant_id &&
          item.unit_id === entity.unit_id &&
          item.is_head_of_unit &&
          item.status === 'active',
      )
    if (duplicate || secondHead) {
      throw new RepositoryConflictError('duplicate position', {
        operation: 'PositionRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds a position by tenant, unit and code.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit of the position.
   * @param code - Position code.
   * @returns The position, or `null`.
   */
  async findByCode(
    tenantId: string,
    unitId: string,
    code: string,
  ): Promise<Position | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.unit_id === unitId &&
        item.code === code &&
        !item.deleted_at,
    )
  }

  /**
   * Finds the active positions of a unit, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit of the positions.
   * @param limit - Most positions to return.
   * @returns The active positions.
   */
  async findActiveByUnit(
    tenantId: string,
    unitId: string,
    limit?: number,
  ): Promise<Position[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.unit_id === unitId &&
        item.status === 'active' &&
        !item.deleted_at,
    )
      .sort((left, right) => left.code.localeCompare(right.code))
      .slice(0, limit)
  }

  /**
   * Finds the active head position of a unit.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit of the position.
   * @returns The head position, or `null`.
   */
  async findActiveHead(
    tenantId: string,
    unitId: string,
  ): Promise<Position | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.unit_id === unitId &&
        item.is_head_of_unit &&
        item.status === 'active' &&
        !item.deleted_at,
    )
  }
}
