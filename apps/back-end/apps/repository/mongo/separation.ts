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
  type SeparationQuery,
  type SeparationRepository,
} from '@repository/interface/separation'
import { Separation } from '@repository/model/separation'
import { SeparationClassification } from '@repository/model/separation.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { SeparationEntity } from './schema/separation'

/**
 * Mongo implementation of `SeparationRepository`, on the shared base. Separations are never
 * deleted; every write is recorded in the change history.
 */
@Injectable()
export class SeparationRepositoryMongo
  extends MongoRepositoryBase<Separation, SeparationEntity>
  implements SeparationRepository
{
  /**
   * @param separationModel - Mongoose model of the `separations` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Change recorder.
   */
  constructor(
    @InjectModel(SeparationEntity.name, MONGO_MAIN_CONNECTION)
    separationModel: Model<SeparationEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(separationModel, transactions, changes, {
      name: 'SeparationRepository',
      entityType: 'separation',
      classification: SeparationClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'type',
        'contract_action',
        'last_working_day',
        'notice_received_on',
        'status',
        'status_since',
        'completion',
        'checklist',
        'settlement',
      ],
    })
  }

  /**
   * Finds separations, by last working day, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The separations.
   */
  async findByFilter(
    tenantId: string,
    query: SeparationQuery = {},
  ): Promise<Separation[]> {
    const operation = 'SeparationRepository.findByFilter'
    if (
      !toObjectId(tenantId) ||
      (query.facilityId !== undefined && !toObjectId(query.facilityId)) ||
      (query.employeeIds !== undefined &&
        query.employeeIds.some((id) => !toObjectId(id)))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.status ? { status: query.status } : {}),
            ...(query.typeCode ? { 'type.code': query.typeCode } : {}),
            ...(query.facilityId ? { facility_id: query.facilityId } : {}),
            ...(query.employeeIds ? { employee_id: { $in: query.employeeIds } } : {}),
            ...(query.from || query.to
              ? {
                  last_working_day: {
                    ...(query.from ? { $gte: query.from } : {}),
                    ...(query.to ? { $lte: query.to } : {}),
                  },
                }
              : {}),
          }),
        )
        .sort({ last_working_day: -1, _id: -1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<SeparationEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the separation of an employee that is not cancelled.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The separation, or `null`.
   */
  async findOpenByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Separation | null> {
    const operation = 'SeparationRepository.findOpenByEmployee'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return null
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            status: { $in: ['planned', 'completed'] },
            deleted_at: null,
          }),
        )
        .limit(1)
        .lean<LeanRecord<SeparationEntity>[]>()
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
   * @returns The separation.
   */
  protected toModel(record: LeanRecord<SeparationEntity>): Separation {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      facility_id: record.facility_id ? record.facility_id.toHexString() : null,
      type: {
        system: record.type.system,
        code: record.type.code,
        ...(record.type.display ? { display: record.type.display } : {}),
      },
      contract_action: record.contract_action,
      last_working_day: record.last_working_day,
      notice_received_on: record.notice_received_on ?? null,
      immediate: record.immediate,
      status: record.status,
      status_since: record.status_since,
      completion: record.completion
        ? {
            at: record.completion.at,
            by: record.completion.by,
            counts: {
              assignments: record.completion.counts.assignments,
              sessions: record.completion.counts.sessions,
              leave_requests: record.completion.counts.leave_requests,
              appointments: record.completion.counts.appointments,
              memberships: record.completion.counts.memberships,
              position_assignments: record.completion.counts.position_assignments,
            },
          }
        : null,
      checklist: (record.checklist ?? []).map((entry) => ({
        item: {
          system: entry.item.system,
          code: entry.item.code,
          ...(entry.item.display ? { display: entry.item.display } : {}),
        },
        done: entry.done ? { by: entry.done.by, at: entry.done.at } : null,
      })),
      settlement: record.settlement
        ? {
            leave: record.settlement.leave.map((item) => ({
              leave_type: {
                system: item.leave_type.system,
                code: item.leave_type.code,
              },
              period: { start: item.period.start, end: item.period.end },
              days_left: item.days_left,
            })),
            notes: record.settlement.notes ?? null,
          }
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
