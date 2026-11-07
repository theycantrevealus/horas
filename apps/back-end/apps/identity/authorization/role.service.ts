import { Inject, Injectable } from '@nestjs/common'
import { AppLogger } from '@utility/logger/service'
import { type RoleRepository } from '@repository/interface/role'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type Role, type ScopeKind } from '@repository/model/role'
import { REPOSITORY_ROLE } from '@repository/token'
import { ConflictError, InvalidRequestError } from '../identity.error'
import { observe } from '../observe'
import { isPermission } from '../permission'

/**
 * Operation name prefix used in logs.
 */
const NAME = 'RoleService'

/**
 * Input to create a role.
 *
 * @property code - Unique code inside the tenant.
 * @property name - Name per language.
 * @property description - Description per language.
 * @property permissions - Permission codes from the catalog.
 * @property allowedScopes - Levels the role may be granted at.
 * @property assignableBy - Role codes allowed to grant it; empty means any role-binding manager.
 */
export interface CreateRoleInput {
  code: string
  name: LocalizedText[]
  description: LocalizedText[]
  permissions: string[]
  allowedScopes: ScopeKind[]
  assignableBy: string[]
}

/**
 * Role management for one tenant. Every method takes the tenant of the caller.
 */
@Injectable()
export class RoleService {
  /**
   * @param roles - Role repository.
   * @param logger - Logger whose context is this class's name.
   */
  constructor(
    @Inject(REPOSITORY_ROLE) private readonly roles: RoleRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the roles of a tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @returns The roles, by code.
   */
  list(tenantId: string): Promise<Role[]> {
    return this.roles.findAll({
      where: { tenant_id: { eq: tenantId } },
      orderBy: { field: 'code' },
    })
  }

  /**
   * Creates a role. Rejects permissions that are not in the catalog.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The role.
   * @returns The created role.
   * @throws InvalidRequestError `unknown_permission` for a permission outside the catalog.
   * @throws ConflictError `role_exists` when the code is taken.
   */
  create(tenantId: string, input: CreateRoleInput): Promise<Role> {
    return observe(
      this.logger,
      'role_create',
      `${NAME}.create`,
      async () => {
        if (!input.permissions.every(isPermission)) {
          throw new InvalidRequestError(
            'unknown_permission',
            'One or more permissions do not exist.',
          )
        }
        if (await this.roles.findByCode(tenantId, input.code)) {
          throw new ConflictError(
            'role_exists',
            'A role with this code already exists.',
          )
        }
        return this.roles.create({
          tenant_id: tenantId,
          code: input.code,
          name: input.name,
          description: input.description,
          permissions: [...new Set(input.permissions)],
          allowed_scopes: input.allowedScopes,
          assignable_by: input.assignableBy,
          is_system: false,
          status: 'active',
        })
      },
      'log',
    )
  }
}
