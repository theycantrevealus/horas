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
  type CoverageQuery,
  type CoverageRequirementRepository,
} from '@repository/interface/coverage-requirement'
import { type Coding } from '@repository/model/common/coding'
import { CoverageRequirement } from '@repository/model/coverage-requirement'
import { CoverageRequirementClassification } from '@repository/model/coverage-requirement.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { CoverageRequirementEntity } from './schema/coverage-requirement'

/**
 * Copies a stored coding to the model, or keeps an unset criterion `null`.
 *
 * @param coding - Stored coding, or `null`.
 * @returns The coding with the fields of the model, or `null`.
 */
function toCoding(coding: Coding | null | undefined): Coding | null {
  return coding ? { system: coding.system, code: coding.code } : null
}

/**
 * Mongo implementation of `CoverageRequirementRepository`. Requirements are never deleted. The
 * unit and the shift are fixed after creation; the rest can change.
 */
@Injectable()
export class CoverageRequirementRepositoryMongo
  extends MongoRepositoryBase<CoverageRequirement, CoverageRequirementEntity>
  implements CoverageRequirementRepository
{
  /**
   * @param requirementModel - Mongoose model of the `coverage_requirements` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(CoverageRequirementEntity.name, MONGO_MAIN_CONNECTION)
    requirementModel: Model<CoverageRequirementEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(requirementModel, transactions, changes, {
      name: 'CoverageRequirementRepository',
      entityType: 'coverage_requirement',
      classification: CoverageRequirementClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'day_pattern',
        'match',
        'min_count',
        'team_leader_required',
        'period',
        'status',
      ],
    })
  }

  /**
   * Finds requirements, ordered by unit, shift and period start.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The requirements.
   */
  async findByFilter(
    tenantId: string,
    query: CoverageQuery = {},
  ): Promise<CoverageRequirement[]> {
    const operation = 'CoverageRequirementRepository.findByFilter'
    if (
      !toObjectId(tenantId) ||
      (query.unitId !== undefined && !toObjectId(query.unitId)) ||
      (query.shiftId !== undefined && !toObjectId(query.shiftId))
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
            ...(query.shiftId ? { shift_definition_id: query.shiftId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.dayPattern ? { day_pattern: query.dayPattern } : {}),
            ...(query.onDate
              ? {
                  'period.start': { $lte: query.onDate },
                  $or: [
                    { 'period.end': null },
                    { 'period.end': { $gte: query.onDate } },
                  ],
                }
              : {}),
          }),
        )
        .sort({ unit_id: 1, shift_definition_id: 1, 'period.start': 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<CoverageRequirementEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the active requirements that use a shift.
   *
   * @param tenantId - Tenant to search in.
   * @param shiftId - The shift.
   * @param limit - Most requirements to return.
   * @returns The requirements.
   */
  async findActiveByShift(
    tenantId: string,
    shiftId: string,
    limit: number,
  ): Promise<CoverageRequirement[]> {
    const operation = 'CoverageRequirementRepository.findActiveByShift'
    if (!toObjectId(tenantId) || !toObjectId(shiftId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            shift_definition_id: shiftId,
            status: 'active',
            deleted_at: null,
          }),
        )
        .limit(limit)
        .lean<LeanRecord<CoverageRequirementEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds every active requirement of a unit and shift.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param shiftId - The shift.
   * @returns The requirements.
   */
  async findActiveByUnitAndShift(
    tenantId: string,
    unitId: string,
    shiftId: string,
  ): Promise<CoverageRequirement[]> {
    const operation = 'CoverageRequirementRepository.findActiveByUnitAndShift'
    if (!toObjectId(tenantId) || !toObjectId(unitId) || !toObjectId(shiftId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            unit_id: unitId,
            shift_definition_id: shiftId,
            status: 'active',
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<CoverageRequirementEntity>[]>()
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
   * @returns The requirement.
   */
  protected toModel(
    record: LeanRecord<CoverageRequirementEntity>,
  ): CoverageRequirement {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      unit_id: record.unit_id.toHexString(),
      shift_definition_id: record.shift_definition_id.toHexString(),
      day_pattern: record.day_pattern,
      match: {
        workforce_category: toCoding(record.match.workforce_category),
        profession: toCoding(record.match.profession),
        specialty: toCoding(record.match.specialty),
        min_clinical_level: toCoding(record.match.min_clinical_level),
      },
      min_count: record.min_count,
      team_leader_required: record.team_leader_required,
      period: { start: record.period.start, end: record.period.end ?? null },
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
