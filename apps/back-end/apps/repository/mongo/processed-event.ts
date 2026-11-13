import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type ProcessedEventRepository } from '@repository/interface/processed-event'
import { ProcessedEvent } from '@repository/model/processed-event'
import { LeanRecord, MongoRepositoryBase } from './base'
import { ProcessedEventEntity } from './schema/processed-event'

/**
 * Mongo implementation of `ProcessedEventRepository`. Records are append-only: update and delete
 * are rejected, and retention is a TTL index. Not recorded in the change history.
 */
@Injectable()
export class ProcessedEventRepositoryMongo
  extends MongoRepositoryBase<ProcessedEvent, ProcessedEventEntity>
  implements ProcessedEventRepository
{
  /**
   * @param eventModel - Mongoose model of the `processed_events` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history (unused: records are not recorded).
   */
  constructor(
    @InjectModel(ProcessedEventEntity.name, MONGO_MAIN_CONNECTION)
    eventModel: Model<ProcessedEventEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(eventModel, transactions, changes, {
      name: 'ProcessedEventRepository',
      entityType: 'processed_event',
      allowUpdate: false,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [],
    })
  }

  /**
   * Finds the record that a consumer handled an event.
   *
   * @param consumer - Name of the consumer.
   * @param eventId - Identifier of the event.
   * @returns The record, or `null`.
   */
  async findByEvent(
    consumer: string,
    eventId: string,
  ): Promise<ProcessedEvent | null> {
    const operation = 'ProcessedEventRepository.findByEvent'
    try {
      const record = await this.model
        .findOne(
          this.toFilter({ consumer, event_id: eventId, deleted_at: null }),
        )
        .lean<LeanRecord<ProcessedEventEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The processed event.
   */
  protected toModel(record: LeanRecord<ProcessedEventEntity>): ProcessedEvent {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      consumer: record.consumer,
      event_id: record.event_id,
      event_type: record.event_type,
      processed_at: record.processed_at,
      expires_at: record.expires_at,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
