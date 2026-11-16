import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  DEFAULT_PAGE_SIZE,
  MONGO_MAIN_CONNECTION,
} from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import {
  type ShiftDefinitionRepository,
  type ShiftQuery,
} from '@repository/interface/shift-definition'
import { ShiftDefinition } from '@repository/model/shift-definition'
import { ShiftDefinitionClassification } from '@repository/model/shift-definition.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { ShiftDefinitionEntity } from './schema/shift-definition'

/**
 * Mongo implementation of `ShiftDefinitionRepository`. Shifts are never deleted. The facility, the
 * code and the type are fixed after creation; the rest can change while a shift is active.
 */
@Injectable()
export class ShiftDefinitionRepositoryMongo
  extends MongoRepositoryBase<ShiftDefinition, ShiftDefinitionEntity>
  implements ShiftDefinitionRepository
{
  /**
   * @param shiftModel - Mongoose model of the `shift_definitions` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(ShiftDefinitionEntity.name, MONGO_MAIN_CONNECTION)
    shiftModel: Model<ShiftDefinitionEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(shiftModel, transactions, changes, {
      name: 'ShiftDefinitionRepository',
      entityType: 'shift_definition',
      classification: ShiftDefinitionClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'name',
        'start_time',
        'end_time',
        'paid_minutes',
        'is_night',
        'unit_ids',
        'status',
      ],
    })
  }

  /**
   * Finds a shift by its code in a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param code - Shift code.
   * @returns The shift, or `null`.
   */
  async findByCode(
    tenantId: string,
    facilityId: string,
    code: string,
  ): Promise<ShiftDefinition | null> {
    const operation = 'ShiftDefinitionRepository.findByCode'
    if (!toObjectId(tenantId) || !toObjectId(facilityId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            facility_id: facilityId,
            code,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<ShiftDefinitionEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds shifts, ordered by facility and code.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The shifts.
   */
  async findByFilter(
    tenantId: string,
    query: ShiftQuery = {},
  ): Promise<ShiftDefinition[]> {
    const operation = 'ShiftDefinitionRepository.findByFilter'
    if (
      !toObjectId(tenantId) ||
      (query.facilityId !== undefined && !toObjectId(query.facilityId)) ||
      (query.allowsUnitId !== undefined && !toObjectId(query.allowsUnitId))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.facilityId ? { facility_id: query.facilityId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.type ? { type: query.type } : {}),
            ...(query.allowsUnitId
              ? {
                  $or: [
                    { unit_ids: { $size: 0 } },
                    { unit_ids: query.allowsUnitId },
                  ],
                }
              : {}),
          }),
        )
        .sort({ facility_id: 1, code: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<ShiftDefinitionEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The shift.
   */
  protected toModel(record: LeanRecord<ShiftDefinitionEntity>): ShiftDefinition {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      facility_id: record.facility_id.toHexString(),
      code: record.code,
      name: record.name.map(({ locale, text }) => ({ locale, text })),
      type: record.type,
      start_time: record.start_time,
      end_time: record.end_time,
      paid_minutes: record.paid_minutes,
      is_night: record.is_night,
      unit_ids: record.unit_ids.map((id) => id.toHexString()),
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
