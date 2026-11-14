import {
  RepositoryConflictError,
  RepositoryError,
} from '@utility/database/error'
import { type FieldCipher, mask } from '@utility/encryption/field-cipher'
import {
  type EntityChanges,
  type NewEntity,
  type Page,
  type UpdateOptions,
} from '@utility/database/interface'
import { InMemoryRepository } from '@utility/testing/in-memory-repository'
import { type CodeConceptRepository } from '@repository/interface/code-concept'
import { type FacilityRepository } from '@repository/interface/facility'
import {
  type CommitteeMembershipRepository,
  type FacilityMembershipQuery,
} from '@repository/interface/committee-membership'
import {
  type CpdRecordQuery,
  type CpdRecordRepository,
} from '@repository/interface/cpd-record'
import { type CpdSummaryRepository } from '@repository/interface/cpd-summary'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import {
  type LicenseQuery,
  type ProfessionalLicenseRepository,
} from '@repository/interface/professional-license'
import {
  type PositionAssignmentRepository,
  type UnitAssignmentQuery,
} from '@repository/interface/position-assignment'
import {
  type EmployeePageOptions,
  type EmployeeRepository,
} from '@repository/interface/employee'
import {
  type HrParameterPageOptions,
  type HrParameterRepository,
} from '@repository/interface/hr-parameter'
import {
  type EmployeePrivateProfileRepository,
  type ProfileFields,
  type RevealedIdentifier,
} from '@repository/interface/employee-private-profile'
import { type PositionRepository } from '@repository/interface/position'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type OrganizationRepository } from '@repository/interface/organization'
import { type CodeConcept } from '@repository/model/code-concept'
import { type CommitteeMembership } from '@repository/model/committee-membership'
import { type CpdRecord } from '@repository/model/cpd-record'
import { type CpdSummary } from '@repository/model/cpd-summary'
import { type BankAccountInput } from '@repository/model/common/bank-account'
import { type PersonIdentifierInput } from '@repository/model/common/person-identifier'
import { type Employee } from '@repository/model/employee'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type EmployeePrivateProfile } from '@repository/model/employee-private-profile'
import { type Facility } from '@repository/model/facility'
import {
  type HrParameter,
  type HrParameterScope,
} from '@repository/model/hr-parameter'
import { type Organization } from '@repository/model/organization'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Position } from '@repository/model/position'
import { type ProfessionalLicense } from '@repository/model/professional-license'
import { type PositionAssignment } from '@repository/model/position-assignment'

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

/**
 * In-memory HR parameter repository for tests. Follows the Mongo unique index on tenant, key,
 * scope and date, and is append-only like the Mongo implementation.
 */
export class InMemoryHrParameters
  extends InMemoryRepository<HrParameter>
  implements HrParameterRepository
{
  /**
   * Creates a value, refusing a second one for the same tenant, key, scope and date.
   *
   * @param entity - Parameter data.
   * @param id - Optional identifier.
   * @returns The stored value.
   */
  override async create(
    entity: NewEntity<HrParameter>,
    id?: string,
  ): Promise<HrParameter> {
    const duplicate = [...this.items.values()].some(
      (item) =>
        item.tenant_id === entity.tenant_id &&
        item.key === entity.key &&
        item.scope.kind === entity.scope.kind &&
        item.scope.id === entity.scope.id &&
        item.effective_from === entity.effective_from,
    )
    if (duplicate) {
      throw new RepositoryConflictError('duplicate parameter', {
        operation: 'HrParameterRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Refuses every update: values are append-only.
   *
   * @throws Error always.
   */
  override async update(): Promise<HrParameter> {
    throw new Error('HrParameterRepository.update is not supported')
  }

  /**
   * Refuses every delete: values are append-only.
   *
   * @throws Error always.
   */
  override async delete(): Promise<void> {
    throw new Error('HrParameterRepository.delete is not supported')
  }

  /**
   * Refuses every soft delete: values are append-only.
   *
   * @throws Error always.
   */
  override async deleteSoft(): Promise<void> {
    throw new Error('HrParameterRepository.deleteSoft is not supported')
  }

  /**
   * Finds every value set for a key.
   *
   * @param tenantId - Tenant to search in.
   * @param key - Parameter key.
   * @returns The values.
   */
  async findByKey(tenantId: string, key: string): Promise<HrParameter[]> {
    return this.filter(
      (item) => item.tenant_id === tenantId && item.key === key,
    )
  }

  /**
   * Finds the value set for a key, scope and date.
   *
   * @param tenantId - Tenant to search in.
   * @param key - Parameter key.
   * @param scope - Level and identifier of the value.
   * @param effectiveFrom - First day the value applies.
   * @returns The value, or `null`.
   */
  async findOneAt(
    tenantId: string,
    key: string,
    scope: HrParameterScope,
    effectiveFrom: string,
  ): Promise<HrParameter | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.key === key &&
        item.scope.kind === scope.kind &&
        item.scope.id === scope.id &&
        item.effective_from === effectiveFrom,
    )
  }

  /**
   * Returns one page of values, ordered by key; with a key filter, newest date first.
   *
   * @param tenantId - Tenant to search in.
   * @param options - Filters and paging.
   * @returns The page.
   */
  async findPage(
    tenantId: string,
    options: HrParameterPageOptions,
  ): Promise<Page<HrParameter>> {
    const rows = this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        (options.key === undefined || item.key === options.key) &&
        (options.scopeKind === undefined ||
          item.scope.kind === options.scopeKind) &&
        (options.scopeId === undefined || item.scope.id === options.scopeId),
    ).sort(
      (left, right) =>
        (options.key === undefined ? left.key.localeCompare(right.key) : 0) ||
        right.effective_from.localeCompare(left.effective_from),
    )
    const limit = options.limit ?? 10
    const offset = options.offset ?? 0
    return {
      data: rows.slice(offset, offset + limit),
      totalRecords: rows.length,
      first: offset,
      rows: limit,
      totalPages: Math.ceil(rows.length / limit),
      currentPage: Math.floor(offset / limit) + 1,
    }
  }
}

/**
 * In-memory employee repository for tests. Follows the Mongo unique indexes on tenant and number
 * (soft-deleted employees count, so a number is never reused) and on tenant and practitioner id.
 */
export class InMemoryEmployees
  extends InMemoryRepository<Employee>
  implements EmployeeRepository
{
  /**
   * Creates an employee, refusing a second one with the same tenant and number, or one that
   * repeats a practitioner identifier of another employee of the tenant.
   *
   * @param entity - Employee data.
   * @param id - Optional identifier.
   * @returns The stored employee.
   */
  override async create(
    entity: NewEntity<Employee>,
    id?: string,
  ): Promise<Employee> {
    const sameTenant = [...this.items.values()].filter(
      (item) => item.tenant_id === entity.tenant_id,
    )
    const duplicate = sameTenant.some(
      (item) =>
        item.employee_number === entity.employee_number ||
        item.practitioner_ids.some((held) =>
          entity.practitioner_ids.some(
            (wanted) =>
              wanted.system === held.system && wanted.value === held.value,
          ),
        ),
    )
    if (duplicate) {
      throw new RepositoryConflictError('duplicate employee', {
        operation: 'EmployeeRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds an employee by tenant and number.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeNumber - Employee number.
   * @returns The employee, or `null`.
   */
  async findByNumber(
    tenantId: string,
    employeeNumber: string,
  ): Promise<Employee | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_number === employeeNumber &&
        !item.deleted_at,
    )
  }

  /**
   * Finds the employee that holds a public registry number.
   *
   * @param tenantId - Tenant to search in.
   * @param system - Registry system.
   * @param value - The number.
   * @returns The employee, or `null`.
   */
  async findByPractitionerId(
    tenantId: string,
    system: string,
    value: string,
  ): Promise<Employee | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        !item.deleted_at &&
        item.practitioner_ids.some(
          (held) => held.system === system && held.value === value,
        ),
    )
  }

  /**
   * Returns one page of employees, ordered by employee number.
   *
   * @param tenantId - Tenant to search in.
   * @param options - Filters and paging.
   * @returns The page.
   */
  async findPage(
    tenantId: string,
    options: EmployeePageOptions,
  ): Promise<Page<Employee>> {
    const rows = this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        !item.deleted_at &&
        (options.name === undefined ||
          item.display_name
            .toLowerCase()
            .includes(options.name.toLowerCase())) &&
        (options.employeeNumber === undefined ||
          item.employee_number.startsWith(options.employeeNumber)) &&
        (options.status === undefined ||
          item.employment_status === options.status) &&
        (options.workforceCategoryCode === undefined ||
          item.workforce_category.code === options.workforceCategoryCode) &&
        (options.isClinical === undefined ||
          item.is_clinical === options.isClinical) &&
        (options.unitId === undefined ||
          item.primary_assignment?.unit_id === options.unitId),
    ).sort((left, right) =>
      left.employee_number.localeCompare(right.employee_number),
    )
    const limit = options.limit ?? 10
    const offset = options.offset ?? 0
    return {
      data: rows.slice(offset, offset + limit),
      totalRecords: rows.length,
      first: offset,
      rows: limit,
      totalPages: Math.ceil(rows.length / limit),
      currentPage: Math.floor(offset / limit) + 1,
    }
  }
}

/**
 * The secret parts of a stored profile, kept apart from the model the way the Mongo implementation
 * stores them: only ciphertext.
 */
export interface StoredSecrets {
  birthDate: string | null
  identifiers: Map<string, string>
  bankAccounts: string[]
}

/**
 * In-memory employee private profile repository for tests. It encrypts, hashes and masks with a
 * real cipher, like the Mongo implementation, so tests exercise the actual secret handling: the
 * models it keeps hold masked values only, and the plain ones exist only as ciphertext.
 */
export class InMemoryEmployeePrivateProfiles
  extends InMemoryRepository<EmployeePrivateProfile>
  implements EmployeePrivateProfileRepository
{
  private readonly secrets = new Map<string, StoredSecrets>()

  /**
   * @param cipher - Cipher that encrypts and hashes the secret fields.
   */
  constructor(private readonly cipher: FieldCipher) {
    super()
  }

  /**
   * Refuses every generic write: the profile has its own writes.
   *
   * @throws Error always.
   */
  override async create(): Promise<EmployeePrivateProfile> {
    throw new Error('EmployeePrivateProfileRepository.create is not supported')
  }

  /**
   * Refuses every generic update.
   *
   * @throws Error always.
   */
  override async update(): Promise<EmployeePrivateProfile> {
    throw new Error('EmployeePrivateProfileRepository.update is not supported')
  }

  /**
   * Refuses every delete.
   *
   * @throws Error always.
   */
  override async delete(): Promise<void> {
    throw new Error('EmployeePrivateProfileRepository.delete is not supported')
  }

  /**
   * Refuses every soft delete.
   *
   * @throws Error always.
   */
  override async deleteSoft(): Promise<void> {
    throw new Error(
      'EmployeePrivateProfileRepository.deleteSoft is not supported',
    )
  }

  /**
   * Returns the ciphertext of everything secret and the stored models, for tests that check what is
   * stored.
   *
   * @returns The stored secrets and models of every profile.
   */
  storedData(): { secrets: StoredSecrets[]; models: EmployeePrivateProfile[] } {
    return {
      secrets: [...this.secrets.values()],
      models: [...this.items.values()],
    }
  }

  /**
   * Finds the profile of an employee, masked, with the birth date decrypted.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee the profile belongs to.
   * @returns The profile, or `null`.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmployeePrivateProfile | null> {
    const profile = this.find(
      (item) => item.tenant_id === tenantId && item.employee_id === employeeId,
    )
    return profile ? this.withBirthDate(profile) : null
  }

  /**
   * Finds one identifier of an employee in full.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee the profile belongs to.
   * @param system - Identifier system.
   * @returns The plain value and its profile, or `null`.
   */
  async findIdentifierValue(
    tenantId: string,
    employeeId: string,
    system: string,
  ): Promise<RevealedIdentifier | null> {
    const profile = this.find(
      (item) => item.tenant_id === tenantId && item.employee_id === employeeId,
    )
    const sealed = profile
      ? this.secrets.get(profile.id)?.identifiers.get(system)
      : undefined
    return profile && sealed
      ? {
          profile_id: profile.id,
          value: this.cipher.decrypt(tenantId, 'identifier_value', sealed),
        }
      : null
  }

  /**
   * Finds the employee that holds an identifier, by its hash.
   *
   * @param tenantId - Tenant to search in.
   * @param system - Identifier system.
   * @param value - Normalized plain value.
   * @returns The identifier of the employee, or `null`.
   */
  async findEmployeeIdByIdentifier(
    tenantId: string,
    system: string,
    value: string,
  ): Promise<string | null> {
    const hash = this.cipher.hash(tenantId, value)
    return (
      this.find(
        (item) =>
          item.tenant_id === tenantId &&
          item.identifiers.some(
            (held) => held.system === system && held.value_hash === hash,
          ),
      )?.employee_id ?? null
    )
  }

  /**
   * Replaces the profile fields.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param fields - The new fields.
   * @param options - Optional concurrency check.
   * @returns The profile after the write.
   */
  saveProfile(
    tenantId: string,
    employeeId: string,
    fields: ProfileFields,
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile> {
    const { birth_date: birthDate, ...plain } = fields
    return this.write(tenantId, employeeId, plain, options, (secrets) => {
      secrets.birthDate =
        birthDate === null
          ? null
          : this.cipher.encrypt(tenantId, 'birth_date', birthDate)
    })
  }

  /**
   * Replaces the identifiers.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param identifiers - The new identifiers, with normalized plain values.
   * @param options - Optional concurrency check.
   * @returns The profile after the write.
   */
  replaceIdentifiers(
    tenantId: string,
    employeeId: string,
    identifiers: PersonIdentifierInput[],
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile> {
    const hashes = identifiers.map((item) => ({
      system: item.system,
      hash: this.cipher.hash(tenantId, item.value),
    }))
    const taken = [...this.items.values()].some(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id !== employeeId &&
        item.identifiers.some((held) =>
          hashes.some(
            ({ system, hash }) =>
              system === held.system && hash === held.value_hash,
          ),
        ),
    )
    if (taken) {
      return Promise.reject(
        new RepositoryConflictError('duplicate identifier', {
          operation: 'EmployeePrivateProfileRepository.replaceIdentifiers',
        }),
      )
    }
    return this.write(
      tenantId,
      employeeId,
      {
        identifiers: identifiers.map((item, index) => ({
          type: item.type,
          system: item.system,
          issuing_country: item.issuing_country,
          value_masked: mask(item.value),
          value_hash: hashes[index].hash,
          period: item.period,
          verified_at: null,
        })),
      },
      options,
      (secrets) => {
        secrets.identifiers = new Map(
          identifiers.map((item) => [
            item.system,
            this.cipher.encrypt(tenantId, 'identifier_value', item.value),
          ]),
        )
      },
    )
  }

  /**
   * Replaces the bank accounts.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param accounts - The new accounts, with normalized plain numbers.
   * @param options - Optional concurrency check.
   * @returns The profile after the write.
   */
  replaceBankAccounts(
    tenantId: string,
    employeeId: string,
    accounts: BankAccountInput[],
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile> {
    return this.write(
      tenantId,
      employeeId,
      {
        bank_accounts: accounts.map((item) => ({
          bank: item.bank,
          account_name: item.account_name,
          account_number_masked: mask(item.account_number),
          swift_bic: item.swift_bic,
          currency: item.currency,
          is_primary: item.is_primary,
        })),
      },
      options,
      (secrets) => {
        secrets.bankAccounts = accounts.map((item) =>
          this.cipher.encrypt(
            tenantId,
            'bank_account_number',
            item.account_number,
          ),
        )
      },
    )
  }

  /**
   * Creates the profile or changes some of its fields, with the same version rules as the Mongo
   * implementation.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param changes - Model fields to set.
   * @param options - Optional concurrency check.
   * @param seal - Stores the secret parts of the write.
   * @returns The profile after the write.
   */
  private async write(
    tenantId: string,
    employeeId: string,
    changes: Partial<EmployeePrivateProfile>,
    options: UpdateOptions | undefined,
    seal: (secrets: StoredSecrets) => void,
  ): Promise<EmployeePrivateProfile> {
    const expected = options?.expectedVersion
    const current = [...this.items.values()].find(
      (item) => item.tenant_id === tenantId && item.employee_id === employeeId,
    )
    if (
      (!current && expected !== undefined) ||
      (current && expected !== undefined && current.version !== expected)
    ) {
      throw new RepositoryConflictError('the profile changed', {
        operation: 'EmployeePrivateProfileRepository.write',
      })
    }
    let id: string
    if (current) {
      id = current.id
      this.items.set(id, {
        ...current,
        ...changes,
        version: current.version + 1,
        updated_at: new Date(),
      })
    } else {
      const created = await InMemoryRepository.prototype.create.call(this, {
        tenant_id: tenantId,
        employee_id: employeeId,
        birth_date: null,
        birth_place: null,
        nationalities: [],
        identifiers: [],
        personal_contacts: [],
        addresses: [],
        marital_status: null,
        religion: null,
        family_members: [],
        emergency_contacts: [],
        bank_accounts: [],
        tax_profile: [],
        ...changes,
      })
      id = created.id
      this.secrets.set(id, {
        birthDate: null,
        identifiers: new Map(),
        bankAccounts: [],
      })
    }
    seal(this.secrets.get(id) as StoredSecrets)
    return this.withBirthDate(
      structuredClone(this.items.get(id) as EmployeePrivateProfile),
    )
  }

  /**
   * Fills the decrypted birth date of a stored profile.
   *
   * @param profile - Profile with a `null` birth date, as stored.
   * @returns The profile with its birth date.
   * @throws RepositoryError when the birth date cannot be decrypted.
   */
  private withBirthDate(
    profile: EmployeePrivateProfile,
  ): EmployeePrivateProfile {
    const sealed = this.secrets.get(profile.id)?.birthDate
    if (!sealed) {
      return profile
    }
    try {
      return {
        ...profile,
        birth_date: this.cipher.decrypt(
          profile.tenant_id,
          'birth_date',
          sealed,
        ),
      }
    } catch {
      throw new RepositoryError('a stored value could not be decrypted', {
        operation: 'EmployeePrivateProfileRepository.findByEmployee',
      })
    }
  }
}

/**
 * In-memory employment contract repository for tests. Follows the Mongo unique indexes on tenant,
 * employer and number, and on tenant and employee for an active contract (when a write sets the
 * status to `active`).
 */
export class InMemoryEmploymentContracts
  extends InMemoryRepository<EmploymentContract>
  implements EmploymentContractRepository
{
  /**
   * Creates a contract, refusing a second one with the same tenant, employer and number, or a
   * second active one for an employee.
   *
   * @param entity - Contract data.
   * @param id - Optional identifier.
   * @returns The stored contract.
   */
  override async create(
    entity: NewEntity<EmploymentContract>,
    id?: string,
  ): Promise<EmploymentContract> {
    this.assertUnique(entity)
    return super.create(entity, id)
  }

  /**
   * Updates a contract, refusing a change to `active` while the employee has another active one.
   *
   * @param id - Contract identifier.
   * @param changes - Fields to change.
   * @param options - Optional concurrency check.
   * @returns The updated contract.
   */
  override async update(
    id: string,
    changes: EntityChanges<EmploymentContract>,
    options?: UpdateOptions,
  ): Promise<EmploymentContract> {
    const current = this.items.get(id)
    if (current && changes.status === 'active') {
      this.assertUnique({ ...current, status: 'active' }, id)
    }
    return super.update(id, changes, options)
  }

  /**
   * Finds a contract by tenant, employer and number.
   *
   * @param tenantId - Tenant to search in.
   * @param organizationId - Employer.
   * @param contractNumber - Contract number.
   * @returns The contract, or `null`.
   */
  async findByNumber(
    tenantId: string,
    organizationId: string,
    contractNumber: string,
  ): Promise<EmploymentContract | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.organization_id === organizationId &&
        item.contract_number === contractNumber &&
        !item.deleted_at,
    )
  }

  /**
   * Finds every contract of an employee, newest start first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The contracts.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmploymentContract[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        !item.deleted_at,
    ).sort((left, right) => right.period.start.localeCompare(left.period.start))
  }

  /**
   * Finds the active contract of an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The active contract, or `null`.
   */
  async findActiveByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmploymentContract | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        item.status === 'active' &&
        !item.deleted_at,
    )
  }

  /**
   * Finds the contract that renews another one.
   *
   * @param tenantId - Tenant to search in.
   * @param previousContractId - The contract that is renewed.
   * @returns The renewal, or `null`.
   */
  async findRenewal(
    tenantId: string,
    previousContractId: string,
  ): Promise<EmploymentContract | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.previous_contract_id === previousContractId &&
        !item.deleted_at,
    )
  }

  /**
   * Applies the unique indexes to a contract that is about to be stored.
   *
   * @param contract - The contract as it will be stored.
   * @param ownId - Identifier of the contract itself, when it already exists.
   * @throws RepositoryConflictError when an index would be broken.
   */
  private assertUnique(
    contract: Pick<
      EmploymentContract,
      | 'tenant_id'
      | 'organization_id'
      | 'contract_number'
      | 'employee_id'
      | 'status'
    >,
    ownId?: string,
  ): void {
    const others = [...this.items.values()].filter(
      (item) => item.tenant_id === contract.tenant_id && item.id !== ownId,
    )
    const duplicateNumber =
      ownId === undefined &&
      others.some(
        (item) =>
          item.organization_id === contract.organization_id &&
          item.contract_number === contract.contract_number,
      )
    const secondActive =
      contract.status === 'active' &&
      others.some(
        (item) =>
          item.employee_id === contract.employee_id && item.status === 'active',
      )
    if (duplicateNumber || secondActive) {
      throw new RepositoryConflictError('duplicate contract', {
        operation: 'EmploymentContractRepository.write',
      })
    }
  }
}

/**
 * In-memory `PositionAssignmentRepository` for tests. It applies the unique indexes of the Mongo
 * collection: one open primary assignment per employee, and one open holder per head-of-unit
 * position.
 */
export class InMemoryPositionAssignments
  extends InMemoryRepository<PositionAssignment>
  implements PositionAssignmentRepository
{
  /**
   * Creates an assignment, refusing a second open primary for an employee or a second open holder
   * of a head position.
   *
   * @param entity - Assignment data.
   * @param id - Optional identifier.
   * @returns The stored assignment.
   */
  override async create(
    entity: NewEntity<PositionAssignment>,
    id?: string,
  ): Promise<PositionAssignment> {
    this.assertUnique(entity)
    return super.create(entity, id)
  }

  /**
   * Finds every assignment of an employee, newest start first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The assignments.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<PositionAssignment[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        !item.deleted_at,
    ).sort((left, right) => right.period.start.localeCompare(left.period.start))
  }

  /**
   * Finds the open assignments of an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The open assignments.
   */
  async findOpenByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<PositionAssignment[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        item.is_open &&
        !item.deleted_at,
    )
  }

  /**
   * Finds the open assignments of a position.
   *
   * @param tenantId - Tenant to search in.
   * @param positionId - The position.
   * @returns The open assignments.
   */
  async findOpenByPosition(
    tenantId: string,
    positionId: string,
  ): Promise<PositionAssignment[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.position_id === positionId &&
        item.is_open &&
        !item.deleted_at,
    )
  }

  /**
   * Finds the assignments of a unit, ordered by start date and then identifier.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param query - Optional status filter and paging.
   * @returns The assignments.
   */
  async findByUnit(
    tenantId: string,
    unitId: string,
    query: UnitAssignmentQuery = {},
  ): Promise<PositionAssignment[]> {
    const offset = query.offset ?? 0
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.unit_id === unitId &&
        (!query.status || item.status === query.status) &&
        !item.deleted_at,
    )
      .sort(
        (left, right) =>
          left.period.start.localeCompare(right.period.start) ||
          left.id.localeCompare(right.id),
      )
      .slice(offset, offset + (query.limit ?? 10))
  }

  /**
   * Tells whether a unit has an open assignment.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @returns True when one exists.
   */
  async findAnyOpenInUnit(tenantId: string, unitId: string): Promise<boolean> {
    return (
      this.find(
        (item) =>
          item.tenant_id === tenantId &&
          item.unit_id === unitId &&
          item.is_open &&
          !item.deleted_at,
      ) !== null
    )
  }

  /**
   * Applies the unique indexes to an assignment that is about to be stored.
   *
   * @param assignment - The assignment as it will be stored.
   * @throws RepositoryConflictError when an index would be broken.
   */
  private assertUnique(
    assignment: Pick<
      PositionAssignment,
      | 'tenant_id'
      | 'employee_id'
      | 'unit_id'
      | 'is_primary'
      | 'is_head_of_unit'
      | 'is_open'
    >,
  ): void {
    if (!assignment.is_open) {
      return
    }
    const others = [...this.items.values()].filter(
      (item) => item.tenant_id === assignment.tenant_id && item.is_open,
    )
    const secondPrimary =
      assignment.is_primary &&
      others.some(
        (item) =>
          item.is_primary && item.employee_id === assignment.employee_id,
      )
    const secondHead =
      assignment.is_head_of_unit &&
      others.some(
        (item) => item.is_head_of_unit && item.unit_id === assignment.unit_id,
      )
    if (secondPrimary || secondHead) {
      throw new RepositoryConflictError('duplicate assignment', {
        operation: 'PositionAssignmentRepository.write',
      })
    }
  }
}

/**
 * In-memory `CommitteeMembershipRepository` for tests. It applies the unique indexes of the Mongo
 * collection: one active membership per person per committee of a facility, and one active chair
 * and one active secretary per committee.
 */
export class InMemoryCommitteeMemberships
  extends InMemoryRepository<CommitteeMembership>
  implements CommitteeMembershipRepository
{
  /**
   * Creates a membership, refusing a second active one for the same person and committee, or a
   * second active chair or secretary.
   *
   * @param entity - Membership data.
   * @param id - Optional identifier.
   * @returns The stored membership.
   */
  override async create(
    entity: NewEntity<CommitteeMembership>,
    id?: string,
  ): Promise<CommitteeMembership> {
    this.assertUnique(entity)
    return super.create(entity, id)
  }

  /**
   * Finds the memberships of a facility's committees.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param query - Optional filters and paging.
   * @returns The memberships, ordered by committee code, start date and identifier.
   */
  async findByFacility(
    tenantId: string,
    facilityId: string,
    query: FacilityMembershipQuery = {},
  ): Promise<CommitteeMembership[]> {
    const offset = query.offset ?? 0
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.facility_id === facilityId &&
        !item.deleted_at &&
        (!query.committee || item.committee.code === query.committee) &&
        (!query.role || item.role.code === query.role) &&
        (!query.status || item.status === query.status),
    )
      .sort(
        (left, right) =>
          left.committee.code.localeCompare(right.committee.code) ||
          left.period.start.localeCompare(right.period.start) ||
          left.id.localeCompare(right.id),
      )
      .slice(offset, offset + (query.limit ?? 10))
  }

  /**
   * Finds the active membership of an employee in one committee of a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param facilityId - The facility.
   * @param committeeCode - Committee code.
   * @returns The active membership, or `null`.
   */
  async findActiveForEmployee(
    tenantId: string,
    employeeId: string,
    facilityId: string,
    committeeCode: string,
  ): Promise<CommitteeMembership | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        item.facility_id === facilityId &&
        item.committee.code === committeeCode &&
        item.status === 'active' &&
        !item.deleted_at,
    )
  }

  /**
   * Finds the active membership with a given role in one committee of a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param committeeCode - Committee code.
   * @param roleCode - Role code.
   * @returns The first active membership with that role, or `null`.
   */
  async findActiveByRole(
    tenantId: string,
    facilityId: string,
    committeeCode: string,
    roleCode: string,
  ): Promise<CommitteeMembership | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.facility_id === facilityId &&
        item.committee.code === committeeCode &&
        item.role.code === roleCode &&
        item.status === 'active' &&
        !item.deleted_at,
    )
  }

  /**
   * Applies the unique indexes to a membership that is about to be stored.
   *
   * @param membership - The membership as it will be stored.
   * @throws RepositoryConflictError when an index would be broken.
   */
  private assertUnique(
    membership: Pick<
      CommitteeMembership,
      'tenant_id' | 'employee_id' | 'facility_id' | 'committee' | 'role' | 'status'
    >,
  ): void {
    if (membership.status !== 'active') {
      return
    }
    const others = [...this.items.values()].filter(
      (item) =>
        item.tenant_id === membership.tenant_id &&
        item.facility_id === membership.facility_id &&
        item.committee.code === membership.committee.code &&
        item.status === 'active',
    )
    const secondRole = others.some(
      (item) => item.employee_id === membership.employee_id,
    )
    const secondSingle =
      (membership.role.code === 'chair' ||
        membership.role.code === 'secretary') &&
      others.some((item) => item.role.code === membership.role.code)
    if (secondRole || secondSingle) {
      throw new RepositoryConflictError('duplicate membership', {
        operation: 'CommitteeMembershipRepository.write',
      })
    }
  }
}

/**
 * In-memory `ProfessionalLicenseRepository` for tests. It applies the unique indexes of the Mongo
 * collection: one live record per tenant, type and normalized number, and at most one valid
 * practice permit per employee, profession and facility.
 */
export class InMemoryProfessionalLicenses
  extends InMemoryRepository<ProfessionalLicense>
  implements ProfessionalLicenseRepository
{
  /**
   * Creates a licence, refusing a second live one with the same type and number.
   *
   * @param entity - Licence data.
   * @param id - Optional identifier.
   * @returns The stored licence.
   */
  override async create(
    entity: NewEntity<ProfessionalLicense>,
    id?: string,
  ): Promise<ProfessionalLicense> {
    this.assertUnique(entity)
    return super.create(entity, id)
  }

  /**
   * Updates a licence, refusing a change to `valid` while another valid practice permit exists
   * for the same employee, profession and facility.
   *
   * @param id - Licence identifier.
   * @param changes - Fields to change.
   * @param options - Optional concurrency check.
   * @returns The updated licence.
   */
  override async update(
    id: string,
    changes: EntityChanges<ProfessionalLicense>,
    options?: UpdateOptions,
  ): Promise<ProfessionalLicense> {
    const current = this.items.get(id)
    if (current && changes.status === 'valid') {
      this.assertUnique({ ...current, status: 'valid' }, id)
    }
    return super.update(id, changes, options)
  }

  /**
   * Finds every licence of an employee, newest issue date first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The licences.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<ProfessionalLicense[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        !item.deleted_at,
    ).sort((left, right) => right.issue_date.localeCompare(left.issue_date))
  }

  /**
   * Finds licences of the tenant with optional filters and paging.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The licences.
   */
  async findByFilter(
    tenantId: string,
    query: LicenseQuery = {},
  ): Promise<ProfessionalLicense[]> {
    const offset = query.offset ?? 0
    const expiry =
      query.expiresFrom !== undefined || query.expiresTo !== undefined
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        !item.deleted_at &&
        (!query.status || item.status === query.status) &&
        (!query.licenseType || item.license_type.code === query.licenseType) &&
        (!query.facilityId ||
          item.practice_location?.facility_id === query.facilityId) &&
        (query.expiresFrom === undefined ||
          (item.expiry_date !== null && item.expiry_date >= query.expiresFrom)) &&
        (query.expiresTo === undefined ||
          (item.expiry_date !== null && item.expiry_date <= query.expiresTo)),
    )
      .sort(
        (left, right) =>
          (expiry
            ? (left.expiry_date ?? '').localeCompare(right.expiry_date ?? '')
            : 0) || left.id.localeCompare(right.id),
      )
      .slice(offset, offset + (query.limit ?? 10))
  }

  /**
   * Finds the live licence with a document number and type.
   *
   * @param tenantId - Tenant to search in.
   * @param typeSystem - Licence type system.
   * @param typeCode - Licence type code.
   * @param normalizedNumber - Normalized document number.
   * @returns The licence, or `null`.
   */
  async findLiveByNumber(
    tenantId: string,
    typeSystem: string,
    typeCode: string,
    normalizedNumber: string,
  ): Promise<ProfessionalLicense | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.license_type.system === typeSystem &&
        item.license_type.code === typeCode &&
        item.document_number_normalized === normalizedNumber &&
        item.is_live &&
        !item.deleted_at,
    )
  }

  /**
   * Applies the unique indexes to a licence that is about to be stored.
   *
   * @param license - The licence as it will be stored.
   * @param ownId - Identifier of the licence itself, when it already exists.
   * @throws RepositoryConflictError when an index would be broken.
   */
  private assertUnique(
    license: Pick<
      ProfessionalLicense,
      | 'tenant_id'
      | 'employee_id'
      | 'license_type'
      | 'document_number_normalized'
      | 'is_live'
      | 'status'
      | 'eligibility_role'
      | 'profession'
      | 'practice_location'
    >,
    ownId?: string,
  ): void {
    const others = [...this.items.values()].filter(
      (item) => item.tenant_id === license.tenant_id && item.id !== ownId,
    )
    const duplicateNumber =
      ownId === undefined &&
      license.is_live &&
      others.some(
        (item) =>
          item.is_live &&
          item.license_type.system === license.license_type.system &&
          item.license_type.code === license.license_type.code &&
          item.document_number_normalized === license.document_number_normalized,
      )
    const facilityId = license.practice_location?.facility_id ?? null
    const secondPermit =
      license.status === 'valid' &&
      license.eligibility_role === 'practice_permit' &&
      facilityId !== null &&
      others.some(
        (item) =>
          item.status === 'valid' &&
          item.eligibility_role === 'practice_permit' &&
          item.employee_id === license.employee_id &&
          item.profession.system === license.profession.system &&
          item.profession.code === license.profession.code &&
          item.practice_location?.facility_id === facilityId,
      )
    if (duplicateNumber || secondPermit) {
      throw new RepositoryConflictError('duplicate license', {
        operation: 'ProfessionalLicenseRepository.write',
      })
    }
  }
}

/**
 * In-memory `CpdRecordRepository` for tests.
 */
export class InMemoryCpdRecords
  extends InMemoryRepository<CpdRecord>
  implements CpdRecordRepository
{
  /**
   * Finds the credit records of an employee, newest activity date first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param query - Optional filters and paging.
   * @returns The records.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
    query: CpdRecordQuery = {},
  ): Promise<CpdRecord[]> {
    const offset = query.offset ?? 0
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        !item.deleted_at &&
        (!query.creditSystem ||
          item.credit_system.code === query.creditSystem) &&
        (!query.status || item.status === query.status),
    )
      .sort(
        (left, right) =>
          right.activity_date.localeCompare(left.activity_date) ||
          left.id.localeCompare(right.id),
      )
      .slice(offset, offset + (query.limit ?? 10))
  }

  /**
   * Finds the accepted records of an employee in one credit system inside a period.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param creditSystem - The credit system.
   * @param from - First day of the period.
   * @param to - Last day of the period.
   * @returns The accepted records.
   */
  async findAcceptedInCycle(
    tenantId: string,
    employeeId: string,
    creditSystem: { system: string; code: string },
    from: string,
    to: string,
  ): Promise<CpdRecord[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        item.status === 'accepted' &&
        item.credit_system.system === creditSystem.system &&
        item.credit_system.code === creditSystem.code &&
        item.activity_date >= from &&
        item.activity_date <= to &&
        !item.deleted_at,
    )
  }
}

/**
 * In-memory `CpdSummaryRepository` for tests. It applies the unique index of the Mongo
 * collection: one summary per tenant, employee and credit system.
 */
export class InMemoryCpdSummaries
  extends InMemoryRepository<CpdSummary>
  implements CpdSummaryRepository
{
  /**
   * Creates a summary, refusing a second one for the same employee and credit system.
   *
   * @param entity - Summary data.
   * @param id - Optional identifier.
   * @returns The stored summary.
   */
  override async create(
    entity: NewEntity<CpdSummary>,
    id?: string,
  ): Promise<CpdSummary> {
    const duplicate = [...this.items.values()].some(
      (item) =>
        item.tenant_id === entity.tenant_id &&
        item.employee_id === entity.employee_id &&
        item.credit_system.system === entity.credit_system.system &&
        item.credit_system.code === entity.credit_system.code,
    )
    if (duplicate) {
      throw new RepositoryConflictError('duplicate summary', {
        operation: 'CpdSummaryRepository.write',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds the summaries of an employee, ordered by credit system code.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The summaries.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<CpdSummary[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        !item.deleted_at,
    ).sort((left, right) =>
      left.credit_system.code.localeCompare(right.credit_system.code),
    )
  }

  /**
   * Finds the summary of an employee in one credit system.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param creditSystem - Credit system code system.
   * @param creditCode - Credit system code.
   * @returns The summary, or `null`.
   */
  async findByEmployeeAndSystem(
    tenantId: string,
    employeeId: string,
    creditSystem: string,
    creditCode: string,
  ): Promise<CpdSummary | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        item.credit_system.system === creditSystem &&
        item.credit_system.code === creditCode &&
        !item.deleted_at,
    )
  }
}
