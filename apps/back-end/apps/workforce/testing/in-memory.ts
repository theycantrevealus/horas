import { RepositoryConflictError } from '@utility/database/error'
import { type NewEntity } from '@utility/database/interface'
import { InMemoryRepository } from '@utility/testing/in-memory-repository'
import { type OrganizationRepository } from '@repository/interface/organization'
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
