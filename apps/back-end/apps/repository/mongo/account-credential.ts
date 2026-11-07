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
import {
  type AccountCredentialRepository,
  type LockoutPolicy,
} from '@repository/interface/account-credential'
import { AccountCredential } from '@repository/model/account-credential'
import { AccountCredentialClassification } from '@repository/model/account-credential.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { AccountCredentialEntity } from './schema/account-credential'

/**
 * Fields of credentials a caller may change. The account and tenant are fixed at creation.
 */
const UPDATABLE_FIELDS = [
  'password_hash',
  'password_history',
  'password_changed_at',
  'must_change',
  'failed_attempts',
  'last_failed_at',
  'locked_until',
] as const

/**
 * Operation name prefix used in errors and logs.
 */
const NAME = 'AccountCredentialRepository'

/**
 * MongoDB implementation of the credential repository. Secret class: only the authentication
 * service and account provisioning inject it. Writes are recorded, but secret fields appear
 * in the change history only as "changed".
 */
@Injectable()
export class AccountCredentialRepositoryMongo
  extends MongoRepositoryBase<AccountCredential, AccountCredentialEntity>
  implements AccountCredentialRepository
{
  /**
   * @param credentialModel - Mongoose model of the credentials collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history.
   */
  constructor(
    @InjectModel(AccountCredentialEntity.name, MONGO_MAIN_CONNECTION)
    credentialModel: Model<AccountCredentialEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(credentialModel, transactions, changes, {
      name: NAME,
      entityType: 'account_credential',
      classification: AccountCredentialClassification,
      allowUpdate: true,
      allowDelete: true,
      allowSoftDelete: false,
      updatableFields: UPDATABLE_FIELDS,
    })
  }

  /**
   * Finds the credentials of an account.
   *
   * @param accountId - Account identifier.
   * @returns The credentials, or `null` for accounts without a password.
   */
  async findByAccountId(accountId: string): Promise<AccountCredential | null> {
    const operation = `${NAME}.findByAccountId`
    if (!toObjectId(accountId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ account_id: accountId }))
        .lean<LeanRecord<AccountCredentialEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Counts one failed login in a single atomic update (an aggregation-pipeline update), so
   * parallel guesses cannot read the same counter and bypass the lockout.
   *
   * @param accountId - Account identifier.
   * @param policy - Lockout policy.
   * @param now - Time of the attempt.
   * @returns The credentials after the attempt.
   */
  async registerFailedAttempt(
    accountId: string,
    policy: LockoutPolicy,
    now: Date,
  ): Promise<AccountCredential> {
    const operation = `${NAME}.registerFailedAttempt`
    const objectId = this.requireObjectId(accountId, operation)
    const filter = this.toFilter({ account_id: objectId })
    const lockUntil = new Date(now.getTime() + policy.lockoutMs)
    try {
      return await this.transactions.run(async () => {
        const before = await this.model
          .findOne(filter)
          .lean<LeanRecord<AccountCredentialEntity>>()
          .exec()
        if (!before) {
          throw this.notFound(accountId, operation)
        }
        // Two stages: the second sees the incremented counter of the first.
        const record = await this.model
          .findOneAndUpdate(
            filter,
            [
              {
                $set: {
                  failed_attempts: {
                    $add: [{ $ifNull: ['$failed_attempts', 0] }, 1],
                  },
                  last_failed_at: now,
                  updated_at: now,
                  version: { $add: [{ $ifNull: ['$version', 0] }, 1] },
                },
              },
              {
                $set: {
                  locked_until: {
                    $cond: [
                      { $gte: ['$failed_attempts', policy.maxAttempts] },
                      lockUntil,
                      '$locked_until',
                    ],
                  },
                },
              },
            ],
            {
              returnDocument: 'after',
              updatePipeline: true,
            },
          )
          .lean<LeanRecord<AccountCredentialEntity>>()
          .exec()
        if (!record) {
          throw this.notFound(accountId, operation)
        }
        const after = this.toModel(record)
        await this.record(this.toModel(before), after, operation)
        return after
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Resets the failed-attempt counter and lockout. Writes nothing when they are already clear,
   * so every successful login does not create a change record.
   *
   * @param accountId - Account identifier.
   * @returns The credentials after the reset.
   */
  async clearFailedAttempts(accountId: string): Promise<AccountCredential> {
    const operation = `${NAME}.clearFailedAttempts`
    const objectId = this.requireObjectId(accountId, operation)
    try {
      return await this.transactions.run(async () => {
        const current = await this.model
          .findOne(this.toFilter({ account_id: objectId }))
          .lean<LeanRecord<AccountCredentialEntity>>()
          .exec()
        if (!current) {
          throw this.notFound(accountId, operation)
        }
        const before = this.toModel(current)
        if (before.failed_attempts === 0 && before.locked_until === null) {
          return before
        }
        return this.update(before.id, {
          failed_attempts: 0,
          locked_until: null,
        })
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Converts stored credentials to the model. Only model fields are copied.
   *
   * @param record - Lean credential document.
   * @returns The credentials.
   */
  protected toModel(
    record: LeanRecord<AccountCredentialEntity>,
  ): AccountCredential {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      account_id: record.account_id.toHexString(),
      password_hash: record.password_hash,
      password_history: [...record.password_history],
      password_changed_at: record.password_changed_at,
      must_change: record.must_change,
      failed_attempts: record.failed_attempts,
      last_failed_at: record.last_failed_at,
      locked_until: record.locked_until,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
