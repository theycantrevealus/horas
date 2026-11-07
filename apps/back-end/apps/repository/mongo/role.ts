import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type RoleRepository } from '@repository/interface/role'
import { Role } from '@repository/model/role'
import { RoleClassification } from '@repository/model/role.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { RoleEntity } from './schema/role'

/**
 * MongoDB implementation of the role repository.
 */
@Injectable()
export class RoleRepositoryMongo
  extends MongoRepositoryBase<Role, RoleEntity>
  implements RoleRepository
{
  /**
   * @param roleModel - Mongoose model of the roles collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history.
   */
  constructor(
    @InjectModel(RoleEntity.name, MONGO_MAIN_CONNECTION)
    roleModel: Model<RoleEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(roleModel, transactions, changes, {
      name: 'RoleRepository',
      entityType: 'role',
      classification: RoleClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: true,
      updatableFields: [
        'name',
        'description',
        'permissions',
        'allowed_scopes',
        'assignable_by',
        'status',
      ],
    })
  }

  /**
   * Finds a role by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Role code.
   * @returns The role, or `null` when none matches.
   */
  async findByCode(tenantId: string, code: string): Promise<Role | null> {
    const operation = 'RoleRepository.findByCode'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ tenant_id: tenantId, code, deleted_at: null }))
        .lean<LeanRecord<RoleEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Converts a stored role to the model. Only model fields are copied.
   *
   * @param record - Lean role document.
   * @returns The role.
   */
  protected toModel(record: LeanRecord<RoleEntity>): Role {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      code: record.code,
      name: record.name.map(({ locale, text }) => ({ locale, text })),
      description: record.description.map(({ locale, text }) => ({
        locale,
        text,
      })),
      permissions: [...record.permissions],
      allowed_scopes: [...record.allowed_scopes],
      assignable_by: [...record.assignable_by],
      is_system: record.is_system,
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
