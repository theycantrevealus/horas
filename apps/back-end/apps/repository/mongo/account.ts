import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type AccountRepository } from '@repository/interface/account'
import { Account, type LoginIdentifierType } from '@repository/model/account'
import { AccountClassification } from '@repository/model/account.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { AccountEntity } from './schema/account'

/**
 * Fields of an account a caller may change. The tenant, type, employee link, request and creator are fixed at creation.
 */
const UPDATABLE_FIELDS = [
  'sponsor_account_id',
  'username',
  'login_identifiers',
  'profile',
  'profile_source',
  'preferences',
  'status',
  'status_changed_at',
  'is_open',
  'holds',
  'validity',
  'mfa_required',
  'authz_version',
  'last_login_at',
  'closed',
] as const

/**
 * Converts an optional ObjectId to its hexadecimal form.
 *
 * @param id - ObjectId or `null`.
 * @returns The hexadecimal string, or `null`.
 */
function toHexOrNull(id: Types.ObjectId | null | undefined): string | null {
  return id ? id.toHexString() : null
}

/**
 * MongoDB implementation of the account repository, on the main connection.
 * Reads never include secrets: credentials live in their own collection.
 */
@Injectable()
export class AccountRepositoryMongo
  extends MongoRepositoryBase<Account, AccountEntity>
  implements AccountRepository
{
  /**
   * @param accountModel - Mongoose model of the accounts collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history.
   */
  constructor(
    @InjectModel(AccountEntity.name, MONGO_MAIN_CONNECTION)
    accountModel: Model<AccountEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(accountModel, transactions, changes, {
      name: 'AccountRepository',
      entityType: 'account',
      classification: AccountClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: UPDATABLE_FIELDS,
    })
  }

  /**
   * Finds the account that logs in with an identifier.
   *
   * @param tenantId - Tenant to search in.
   * @param type - Identifier kind.
   * @param normalized - Normalized identifier value.
   * @returns The account, or `null` when none matches.
   */
  async findByLoginIdentifier(
    tenantId: string,
    type: LoginIdentifierType,
    normalized: string,
  ): Promise<Account | null> {
    const operation = 'AccountRepository.findByLoginIdentifier'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      // `$elemMatch` keeps type and value on the same identifier.
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            login_identifiers: { $elemMatch: { type, normalized } },
          }),
        )
        .lean<LeanRecord<AccountEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the open account linked to an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee identifier.
   * @returns The account, or `null` when the employee has none.
   */
  async findByEmployeeId(
    tenantId: string,
    employeeId: string,
  ): Promise<Account | null> {
    const operation = 'AccountRepository.findByEmployeeId'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            is_open: true,
          }),
        )
        .lean<LeanRecord<AccountEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Converts a stored account to the model. Only model fields are copied.
   *
   * @param record - Lean account document.
   * @returns The account.
   */
  protected toModel(record: LeanRecord<AccountEntity>): Account {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      account_type: record.account_type,
      employee_id: toHexOrNull(record.employee_id),
      sponsor_account_id: toHexOrNull(record.sponsor_account_id),
      username: record.username,
      login_identifiers: record.login_identifiers.map((item) => ({
        type: item.type,
        value: item.value,
        normalized: item.normalized,
        is_primary: item.is_primary,
        verified_at: item.verified_at,
      })),
      profile: {
        display_name: record.profile.display_name,
        ...(record.profile.given_name
          ? { given_name: record.profile.given_name }
          : {}),
        ...(record.profile.family_name
          ? { family_name: record.profile.family_name }
          : {}),
        ...(record.profile.avatar ? { avatar: record.profile.avatar } : {}),
      },
      profile_source: record.profile_source,
      preferences: {
        locale: record.preferences.locale,
        timezone: record.preferences.timezone,
        default_facility_id: record.preferences.default_facility_id,
      },
      status: record.status,
      status_changed_at: record.status_changed_at,
      is_open: record.is_open,
      holds: record.holds.map((hold) => ({
        kind: hold.kind,
        reason: hold.reason,
        source: hold.source,
        source_ref: hold.source_ref,
        placed_by: hold.placed_by,
        placed_at: hold.placed_at,
        ...(hold.notes ? { notes: hold.notes } : {}),
      })),
      validity: {
        not_before: record.validity.not_before,
        expires_at: record.validity.expires_at,
      },
      mfa_required: record.mfa_required,
      authz_version: record.authz_version,
      last_login_at: record.last_login_at,
      request_id: toHexOrNull(record.request_id),
      closed: record.closed,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
