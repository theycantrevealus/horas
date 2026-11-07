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
import { type AccountSessionRepository } from '@repository/interface/account-session'
import { AccountSession } from '@repository/model/account-session'
import { LeanRecord, MongoRepositoryBase } from './base'
import { AccountSessionEntity } from './schema/account-session'

/**
 * Operation name prefix used in errors and logs.
 */
const NAME = 'AccountSessionRepository'

/**
 * Sessions an explicit revocation still has to end: valid ones, and ones replaced by a refresh
 * rotation, whose access tokens stay usable until they expire.
 */
const STILL_USABLE = {
  $or: [{ revoked_at: null }, { revoke_reason: 'rotated' }],
}

/**
 * MongoDB implementation of the session repository. Sessions are not business data, so
 * writes are not recorded in the change history; login and logout are in `security_events`.
 * Revocation uses bulk updates, which is allowed because the collection is not recorded.
 */
@Injectable()
export class AccountSessionRepositoryMongo
  extends MongoRepositoryBase<AccountSession, AccountSessionEntity>
  implements AccountSessionRepository
{
  /**
   * @param sessionModel - Mongoose model of the sessions collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history (unused: sessions are not recorded).
   */
  constructor(
    @InjectModel(AccountSessionEntity.name, MONGO_MAIN_CONNECTION)
    sessionModel: Model<AccountSessionEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(sessionModel, transactions, changes, {
      name: NAME,
      entityType: 'account_session',
      allowUpdate: true,
      allowDelete: true,
      allowSoftDelete: false,
      updatableFields: ['last_seen_at', 'revoked_at', 'revoke_reason'],
    })
  }

  /**
   * Finds a session by the hash of its refresh token.
   *
   * @param refreshTokenHash - SHA-256 of the refresh token.
   * @returns The session, or `null` when none matches.
   */
  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<AccountSession | null> {
    const operation = `${NAME}.findByRefreshTokenHash`
    try {
      const record = await this.model
        .findOne(this.toFilter({ refresh_token_hash: refreshTokenHash }))
        .lean<LeanRecord<AccountSessionEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Revokes a valid, unexpired session in one atomic update and returns it as it was before.
   *
   * @param refreshTokenHash - SHA-256 of the refresh token.
   * @param reason - Why the session ends.
   * @param now - Revocation time.
   * @returns The session before revocation, or `null` when it was revoked, expired or does not exist.
   */
  async consume(
    refreshTokenHash: string,
    reason: string,
    now: Date,
  ): Promise<AccountSession | null> {
    const operation = `${NAME}.consume`
    try {
      const record = await this.model
        .findOneAndUpdate(
          this.toFilter({
            refresh_token_hash: refreshTokenHash,
            revoked_at: null,
            expires_at: { $gt: now },
          }),
          {
            $set: { revoked_at: now, revoke_reason: reason, updated_at: now },
            $inc: { version: 1 },
          },
          { returnDocument: 'before' },
        )
        .lean<LeanRecord<AccountSessionEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Revokes every valid or rotated session of a rotation family.
   *
   * @param familyId - Family identifier.
   * @param reason - Why the sessions end.
   * @param now - Revocation time.
   * @returns Number of sessions revoked.
   */
  async revokeFamily(
    familyId: string,
    reason: string,
    now: Date,
  ): Promise<number> {
    const operation = `${NAME}.revokeFamily`
    try {
      const result = await this.model
        .updateMany(this.toFilter({ family_id: familyId, ...STILL_USABLE }), {
          $set: { revoked_at: now, revoke_reason: reason, updated_at: now },
          $inc: { version: 1 },
        })
        .exec()
      return result.modifiedCount
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Revokes every valid session of an account.
   *
   * @param accountId - Account identifier.
   * @param reason - Why the sessions end.
   * @param now - Revocation time.
   * @param exceptSessionId - Session to keep.
   * @returns Number of sessions revoked.
   */
  async revokeAllOfAccount(
    accountId: string,
    reason: string,
    now: Date,
    exceptSessionId?: string,
  ): Promise<number> {
    const operation = `${NAME}.revokeAllOfAccount`
    const except = exceptSessionId ? toObjectId(exceptSessionId) : null
    if (!toObjectId(accountId)) {
      return 0
    }
    try {
      const result = await this.model
        .updateMany(
          this.toFilter({
            account_id: accountId,
            ...STILL_USABLE,
            ...(except ? { _id: { $ne: except } } : {}),
          }),
          {
            $set: { revoked_at: now, revoke_reason: reason, updated_at: now },
            $inc: { version: 1 },
          },
        )
        .exec()
      return result.modifiedCount
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Converts a stored session to the model. Only model fields are copied.
   *
   * @param record - Lean session document.
   * @returns The session.
   */
  protected toModel(record: LeanRecord<AccountSessionEntity>): AccountSession {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      account_id: record.account_id.toHexString(),
      refresh_token_hash: record.refresh_token_hash,
      family_id: record.family_id,
      client: {
        app: record.client.app,
        ...(record.client.device_label
          ? { device_label: record.client.device_label }
          : {}),
        user_agent_hash: record.client.user_agent_hash,
      },
      facility_id: record.facility_id ? record.facility_id.toHexString() : null,
      authenticated_with: {
        method: record.authenticated_with.method,
        mfa: record.authenticated_with.mfa,
        at: record.authenticated_with.at,
      },
      last_seen_at: record.last_seen_at,
      expires_at: record.expires_at,
      revoked_at: record.revoked_at,
      revoke_reason: record.revoke_reason,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
