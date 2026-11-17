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
  type RosterQuery,
  type RosterRepository,
} from '@repository/interface/roster'
import { type ActorStamp } from '@repository/model/common/actor-stamp'
import { Roster } from '@repository/model/roster'
import { RosterClassification } from '@repository/model/roster.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { type ActorStampEntity } from './schema/common/actor-stamp'
import { RosterEntity } from './schema/roster'

/**
 * Copies a stored stamp to the model, or keeps it `null`.
 *
 * @param stamp - Stored stamp, or `null`.
 * @returns The stamp with the fields of the model, or `null`.
 */
function toStamp(stamp: ActorStampEntity | null | undefined): ActorStamp | null {
  return stamp ? { by: stamp.by, at: stamp.at } : null
}

/**
 * Mongo implementation of `RosterRepository`. Rosters are never deleted. The unit, the facility,
 * the period and the preparer are fixed after creation; only the lifecycle fields change.
 */
@Injectable()
export class RosterRepositoryMongo
  extends MongoRepositoryBase<Roster, RosterEntity>
  implements RosterRepository
{
  /**
   * @param rosterModel - Mongoose model of the `rosters` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(RosterEntity.name, MONGO_MAIN_CONNECTION)
    rosterModel: Model<RosterEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(rosterModel, transactions, changes, {
      name: 'RosterRepository',
      entityType: 'roster',
      classification: RosterClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'status',
        'revision',
        'submitted',
        'approved',
        'published',
        'closed',
        'return_reason',
      ],
    })
  }

  /**
   * Finds rosters, latest period first, then by unit.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The rosters.
   */
  async findByFilter(
    tenantId: string,
    query: RosterQuery = {},
  ): Promise<Roster[]> {
    const operation = 'RosterRepository.findByFilter'
    if (
      !toObjectId(tenantId) ||
      (query.unitId !== undefined && !toObjectId(query.unitId)) ||
      (query.facilityId !== undefined && !toObjectId(query.facilityId))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.unitId ? { unit_id: query.unitId } : {}),
            ...(query.facilityId ? { facility_id: query.facilityId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.open
              ? { status: { $in: ['draft', 'submitted', 'approved', 'published'] } }
              : {}),
            ...(query.to ? { 'period.start': { $lte: query.to } } : {}),
            ...(query.from ? { 'period.end': { $gte: query.from } } : {}),
          }),
        )
        .sort({ 'period.start': -1, unit_id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<RosterEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the roster of a unit that starts on a date.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param start - First day of the period.
   * @returns The roster, or `null`.
   */
  async findByUnitAndStart(
    tenantId: string,
    unitId: string,
    start: string,
  ): Promise<Roster | null> {
    const operation = 'RosterRepository.findByUnitAndStart'
    if (!toObjectId(tenantId) || !toObjectId(unitId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            unit_id: unitId,
            'period.start': start,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<RosterEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the rosters of a unit whose period shares a day with a range.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param start - First day of the range.
   * @param end - Last day of the range.
   * @returns The overlapping rosters.
   */
  async findOverlapping(
    tenantId: string,
    unitId: string,
    start: string,
    end: string,
  ): Promise<Roster[]> {
    const operation = 'RosterRepository.findOverlapping'
    if (!toObjectId(tenantId) || !toObjectId(unitId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            unit_id: unitId,
            'period.start': { $lte: end },
            'period.end': { $gte: start },
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<RosterEntity>[]>()
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
   * @returns The roster.
   */
  protected toModel(record: LeanRecord<RosterEntity>): Roster {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      unit_id: record.unit_id.toHexString(),
      facility_id: record.facility_id.toHexString(),
      period: { start: record.period.start, end: record.period.end ?? '' },
      status: record.status,
      revision: record.revision,
      prepared_by: record.prepared_by,
      submitted: toStamp(record.submitted),
      approved: toStamp(record.approved),
      published: toStamp(record.published),
      closed: toStamp(record.closed),
      return_reason: record.return_reason ?? null,
      coverage_overrides: record.coverage_overrides.map((item) => ({
        date: item.date,
        shift_definition_id: item.shift_definition_id.toHexString(),
        requirement_id: item.requirement_id.toHexString(),
        reason: item.reason,
        by: item.by,
        at: item.at,
      })),
      validation: record.validation
        ? {
            checked_at: record.validation.checked_at,
            violations: record.validation.violations,
            coverage_gaps: record.validation.coverage_gaps,
          }
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
