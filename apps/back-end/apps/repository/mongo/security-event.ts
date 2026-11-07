import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type SecurityEventRepository } from '@repository/interface/security-event'
import { SecurityEvent } from '@repository/model/security-event'
import { LeanRecord, MongoRepositoryBase } from './base'
import { SecurityEventEntity } from './schema/security-event'

/**
 * MongoDB implementation of the security event repository. Events are append-only:
 * update and delete are rejected, and retention is a TTL index. Not recorded in the change history.
 */
@Injectable()
export class SecurityEventRepositoryMongo
  extends MongoRepositoryBase<SecurityEvent, SecurityEventEntity>
  implements SecurityEventRepository
{
  /**
   * @param eventModel - Mongoose model of the security events collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history (unused: events are not recorded).
   */
  constructor(
    @InjectModel(SecurityEventEntity.name, MONGO_MAIN_CONNECTION)
    eventModel: Model<SecurityEventEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(eventModel, transactions, changes, {
      name: 'SecurityEventRepository',
      entityType: 'security_event',
      allowUpdate: false,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [],
    })
  }

  /**
   * Converts a stored event to the model. Only model fields are copied.
   *
   * @param record - Lean event document.
   * @returns The event.
   */
  protected toModel(record: LeanRecord<SecurityEventEntity>): SecurityEvent {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      account_id: record.account_id ? record.account_id.toHexString() : null,
      type: record.type,
      occurred_at: record.occurred_at,
      ip: record.ip,
      user_agent_hash: record.user_agent_hash,
      correlation_id: record.correlation_id,
      outcome: record.outcome,
      reason_code: record.reason_code,
      expires_at: record.expires_at,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
