import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { DEFAULT_PAGE_SIZE } from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import {
  type PositionAssignmentRepository,
  type UnitAssignmentQuery,
} from '@repository/interface/position-assignment'
import { PositionAssignment } from '@repository/model/position-assignment'
import { PositionAssignmentClassification } from '@repository/model/position-assignment.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { PositionAssignmentEntity } from './schema/position-assignment'

/**
 * Mongo implementation of `PositionAssignmentRepository`. Assignments are never deleted and never
 * edited except to end them: the employee, position, unit, contract and kind are not updatable.
 */
@Injectable()
export class PositionAssignmentRepositoryMongo
  extends MongoRepositoryBase<PositionAssignment, PositionAssignmentEntity>
  implements PositionAssignmentRepository
{
  /**
   * @param assignmentModel - Mongoose model of the `position_assignments` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(PositionAssignmentEntity.name, MONGO_MAIN_CONNECTION)
    assignmentModel: Model<PositionAssignmentEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(assignmentModel, transactions, changes, {
      name: 'PositionAssignmentRepository',
      entityType: 'position_assignment',
      classification: PositionAssignmentClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['status', 'is_open', 'period'],
    })
  }

  /**
   * Finds every assignment of an employee, newest start first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The assignments.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<PositionAssignment[]> {
    return this.findMany(
      'findByEmployee',
      [tenantId, employeeId],
      { tenant_id: tenantId, employee_id: employeeId },
      { 'period.start': -1, _id: 1 },
    )
  }

  /**
   * Finds the open assignments of an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The open assignments.
   */
  async findOpenByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<PositionAssignment[]> {
    return this.findMany(
      'findOpenByEmployee',
      [tenantId, employeeId],
      { tenant_id: tenantId, employee_id: employeeId, is_open: true },
      { 'period.start': 1, _id: 1 },
    )
  }

  /**
   * Finds the open assignments of a position.
   *
   * @param tenantId - Tenant to search in.
   * @param positionId - The position.
   * @returns The open assignments.
   */
  async findOpenByPosition(
    tenantId: string,
    positionId: string,
  ): Promise<PositionAssignment[]> {
    return this.findMany(
      'findOpenByPosition',
      [tenantId, positionId],
      { tenant_id: tenantId, position_id: positionId, is_open: true },
      { 'period.start': 1, _id: 1 },
    )
  }

  /**
   * Finds the assignments of a unit, ordered by start date and then identifier.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param query - Optional status filter and paging.
   * @returns The assignments.
   */
  async findByUnit(
    tenantId: string,
    unitId: string,
    query: UnitAssignmentQuery = {},
  ): Promise<PositionAssignment[]> {
    return this.findMany(
      'findByUnit',
      [tenantId, unitId],
      {
        tenant_id: tenantId,
        unit_id: unitId,
        ...(query.status ? { status: query.status } : {}),
      },
      { 'period.start': 1, _id: 1 },
      query.limit ?? DEFAULT_PAGE_SIZE,
      query.offset ?? 0,
    )
  }

  /**
   * Tells whether a unit has an open assignment.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @returns True when one exists.
   */
  async findAnyOpenInUnit(tenantId: string, unitId: string): Promise<boolean> {
    const found = await this.findMany(
      'findAnyOpenInUnit',
      [tenantId, unitId],
      { tenant_id: tenantId, unit_id: unitId, is_open: true },
      { _id: 1 },
      1,
      0,
    )
    return found.length > 0
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The assignment.
   */
  protected toModel(
    record: LeanRecord<PositionAssignmentEntity>,
  ): PositionAssignment {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      contract_id: record.contract_id.toHexString(),
      position_id: record.position_id.toHexString(),
      unit_id: record.unit_id.toHexString(),
      facility_id: record.facility_id.toHexString(),
      is_primary: record.is_primary,
      is_head_of_unit: record.is_head_of_unit,
      kind: toCoding(record.kind),
      period: { start: record.period.start, end: record.period.end },
      fte: record.fte,
      status: record.status,
      is_open: record.is_open,
      decision_ref: record.decision_ref
        ? {
            number: record.decision_ref.number,
            document: record.decision_ref.document
              ? {
                  file_id: record.decision_ref.document.file_id,
                  content_type: record.decision_ref.document.content_type,
                  sha256: record.decision_ref.document.sha256,
                }
              : null,
          }
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Runs a named read that returns a list.
   *
   * @param name - Method name for the operation label.
   * @param ids - Identifiers in the filter; a malformed one gives an empty list.
   * @param filter - Filter on model fields.
   * @param sort - Sort order.
   * @param limit - Largest number of records, or `undefined` for all.
   * @param skip - Records to skip.
   * @returns The assignments.
   */
  private async findMany(
    name: string,
    ids: string[],
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    limit?: number,
    skip = 0,
  ): Promise<PositionAssignment[]> {
    const operation = `PositionAssignmentRepository.${name}`
    if (ids.some((value) => !toObjectId(value))) {
      return []
    }
    try {
      let query = this.model
        .find(this.toFilter({ ...filter, deleted_at: null }))
        .sort(sort)
        .skip(skip)
      if (limit !== undefined) {
        query = query.limit(limit)
      }
      const records = await query
        .lean<LeanRecord<PositionAssignmentEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }
}
