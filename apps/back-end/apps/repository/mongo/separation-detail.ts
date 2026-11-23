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
import { type SeparationDetailRepository } from '@repository/interface/separation-detail'
import { SeparationDetail } from '@repository/model/separation-detail'
import { SeparationDetailClassification } from '@repository/model/separation-detail.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { SeparationDetailEntity } from './schema/separation-detail'

/**
 * Mongo implementation of `SeparationDetailRepository`, on the shared base. The reason can be
 * replaced while the separation is planned; the change history keeps the old values.
 */
@Injectable()
export class SeparationDetailRepositoryMongo
  extends MongoRepositoryBase<SeparationDetail, SeparationDetailEntity>
  implements SeparationDetailRepository
{
  /**
   * @param detailModel - Mongoose model of the `separation_details` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Change recorder.
   */
  constructor(
    @InjectModel(SeparationDetailEntity.name, MONGO_MAIN_CONNECTION)
    detailModel: Model<SeparationDetailEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(detailModel, transactions, changes, {
      name: 'SeparationDetailRepository',
      entityType: 'separation_detail',
      classification: SeparationDetailClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['reason'],
    })
  }

  /**
   * Finds the detail of a separation.
   *
   * @param tenantId - Tenant to search in.
   * @param separationId - The separation.
   * @returns The detail, or `null`.
   */
  async findBySeparation(
    tenantId: string,
    separationId: string,
  ): Promise<SeparationDetail | null> {
    const operation = 'SeparationDetailRepository.findBySeparation'
    if (!toObjectId(tenantId) || !toObjectId(separationId)) {
      return null
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            separation_id: separationId,
            deleted_at: null,
          }),
        )
        .limit(1)
        .lean<LeanRecord<SeparationDetailEntity>[]>()
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
    record: LeanRecord<SeparationDetailEntity>,
  ): SeparationDetail {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      separation_id: record.separation_id.toHexString(),
      employee_id: record.employee_id.toHexString(),
      reason: record.reason,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
