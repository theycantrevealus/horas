import { type Repository } from '@utility/database/interface'
import { type CodeConcept } from '@repository/model/code-concept'

/**
 * Code concept data access. Inject it with `REPOSITORY_CODE_CONCEPT`. A concept without a tenant
 * is platform-wide and shared by every tenant; a tenant concept replaces a platform concept with
 * the same system and code.
 */
export interface CodeConceptRepository extends Repository<CodeConcept> {
  /**
   * Finds the concept a tenant sees for a code: its own concept when it has one, otherwise the
   * platform-wide one.
   *
   * @param tenantId - Tenant that asks.
   * @param system - Code system.
   * @param code - Code inside the system.
   * @returns The concept, or `null` when neither exists.
   */
  findByCode(
    tenantId: string,
    system: string,
    code: string,
  ): Promise<CodeConcept | null>

  /**
   * Finds the concept the tenant itself owns for a code, ignoring platform-wide concepts.
   *
   * @param tenantId - Tenant that owns the concept.
   * @param system - Code system.
   * @param code - Code inside the system.
   * @returns The tenant's concept, or `null`.
   */
  findOwn(
    tenantId: string,
    system: string,
    code: string,
  ): Promise<CodeConcept | null>

  /**
   * Finds every concept of a system that a tenant can see: its own and the platform-wide ones,
   * both versions when a code exists in both, ordered by code.
   *
   * @param tenantId - Tenant that asks.
   * @param system - Code system.
   * @returns The tenant and platform concepts, possibly none.
   */
  findBySystem(tenantId: string, system: string): Promise<CodeConcept[]>
}
