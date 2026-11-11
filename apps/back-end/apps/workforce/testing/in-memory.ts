import { RepositoryConflictError } from '@utility/database/error'
import { type NewEntity } from '@utility/database/interface'
import { InMemoryRepository } from '@utility/testing/in-memory-repository'
import { type CodeConceptRepository } from '@repository/interface/code-concept'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationRepository } from '@repository/interface/organization'
import { type CodeConcept } from '@repository/model/code-concept'
import { type Facility } from '@repository/model/facility'
import { type Organization } from '@repository/model/organization'

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
