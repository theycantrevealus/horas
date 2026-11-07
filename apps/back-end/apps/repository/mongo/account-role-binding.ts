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
import { type AccountRoleBindingRepository } from '@repository/interface/account-role-binding'
import { AccountRoleBinding } from '@repository/model/account-role-binding'
import { AccountRoleBindingClassification } from '@repository/model/account-role-binding.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { AccountRoleBindingEntity } from './schema/account-role-binding'

/**
 * MongoDB implementation of the role binding repository.
 * A binding is never deleted: it ends or is revoked, so access history stays complete.
 */
@Injectable()
export class AccountRoleBindingRepositoryMongo
  extends MongoRepositoryBase<AccountRoleBinding, AccountRoleBindingEntity>
  implements AccountRoleBindingRepository
{
  /**
   * @param bindingModel - Mongoose model of the role bindings collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history.
   */
  constructor(
    @InjectModel(AccountRoleBindingEntity.name, MONGO_MAIN_CONNECTION)
    bindingModel: Model<AccountRoleBindingEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(bindingModel, transactions, changes, {
      name: 'AccountRoleBindingRepository',
      entityType: 'account_role_binding',
      classification: AccountRoleBindingClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['period', 'status', 'approved_by', 'reason'],
    })
  }

  /**
   * Returns the bindings of an account that are in force at a moment.
   *
   * @param tenantId - Tenant of the account.
   * @param accountId - Account identifier.
   * @param at - Moment to evaluate.
   * @returns The bindings in force.
   */
  async findInForce(
    tenantId: string,
    accountId: string,
    at: Date,
  ): Promise<AccountRoleBinding[]> {
    const operation = 'AccountRoleBindingRepository.findInForce'
    if (!toObjectId(tenantId) || !toObjectId(accountId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            account_id: accountId,
            status: 'active',
            'period.start': { $lte: at },
            $or: [{ 'period.end': null }, { 'period.end': { $gt: at } }],
          }),
        )
        .lean<LeanRecord<AccountRoleBindingEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Converts a stored binding to the model. Only model fields are copied.
   *
   * @param record - Lean binding document.
   * @returns The binding.
   */
  protected toModel(
    record: LeanRecord<AccountRoleBindingEntity>,
  ): AccountRoleBinding {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      account_id: record.account_id.toHexString(),
      role_id: record.role_id.toHexString(),
      scope: {
        kind: record.scope.kind,
        ...(record.scope.organization_id
          ? { organization_id: record.scope.organization_id }
          : {}),
        ...(record.scope.facility_id
          ? { facility_id: record.scope.facility_id }
          : {}),
        ...(record.scope.unit_id ? { unit_id: record.scope.unit_id } : {}),
        include_descendants: record.scope.include_descendants,
      },
      source: record.source,
      source_ref: record.source_ref,
      period: { start: record.period.start, end: record.period.end },
      granted_by: record.granted_by,
      approved_by: record.approved_by,
      reason: record.reason,
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
