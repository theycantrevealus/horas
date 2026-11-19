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
import { type LeaveRequestDetailRepository } from '@repository/interface/leave-request-detail'
import { LeaveRequestDetail } from '@repository/model/leave-request-detail'
import { LeaveRequestDetailClassification } from '@repository/model/leave-request-detail.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { LeaveRequestDetailEntity } from './schema/leave-request-detail'

/**
 * Mongo implementation of `LeaveRequestDetailRepository`. Details are never deleted. The reason,
 * the request and the employee are fixed after creation; only the proof can be given later.
 */
@Injectable()
export class LeaveRequestDetailRepositoryMongo
  extends MongoRepositoryBase<LeaveRequestDetail, LeaveRequestDetailEntity>
  implements LeaveRequestDetailRepository
{
  /**
   * @param detailModel - Mongoose model of the `leave_request_details` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(LeaveRequestDetailEntity.name, MONGO_MAIN_CONNECTION)
    detailModel: Model<LeaveRequestDetailEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(detailModel, transactions, changes, {
      name: 'LeaveRequestDetailRepository',
      entityType: 'leave_request_detail',
      classification: LeaveRequestDetailClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['proof'],
    })
  }

  /**
   * Finds the detail of a request.
   *
   * @param tenantId - Tenant to search in.
   * @param requestId - The request.
   * @returns The detail, or `null`.
   */
  async findByRequest(
    tenantId: string,
    requestId: string,
  ): Promise<LeaveRequestDetail | null> {
    const operation = 'LeaveRequestDetailRepository.findByRequest'
    if (!toObjectId(tenantId) || !toObjectId(requestId)) {
      return null
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            request_id: requestId,
            deleted_at: null,
          }),
        )
        .limit(1)
        .lean<LeanRecord<LeaveRequestDetailEntity>[]>()
        .exec()
      const record = records[0]
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The detail.
   */
  protected toModel(
    record: LeanRecord<LeaveRequestDetailEntity>,
  ): LeaveRequestDetail {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      request_id: record.request_id.toHexString(),
      employee_id: record.employee_id.toHexString(),
      reason: record.reason,
      proof: record.proof
        ? {
            file_id: record.proof.file_id,
            content_type: record.proof.content_type,
            sha256: record.proof.sha256,
          }
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
