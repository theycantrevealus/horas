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
  type ShiftSwapRequestRepository,
  type SwapQuery,
} from '@repository/interface/shift-swap-request'
import { ShiftSwapRequest } from '@repository/model/shift-swap-request'
import { ShiftSwapRequestClassification } from '@repository/model/shift-swap-request.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import {
  ShiftSwapRequestEntity,
  type SwapPartyEntity,
} from './schema/shift-swap-request'

/**
 * Maps a stored party to the model.
 *
 * @param party - Stored party.
 * @returns The party with the fields of the model.
 */
function toParty(party: SwapPartyEntity): {
  employee_id: string
  assignment_id: string | null
} {
  return {
    employee_id: party.employee_id.toHexString(),
    assignment_id: party.assignment_id ? party.assignment_id.toHexString() : null,
  }
}

/**
 * Mongo implementation of `ShiftSwapRequestRepository`. Requests are never deleted. The unit,
 * roster, parties and reason are fixed after creation; the status, the counterpart's answer, the
 * decision and the resulting assignments change.
 */
@Injectable()
export class ShiftSwapRequestRepositoryMongo
  extends MongoRepositoryBase<ShiftSwapRequest, ShiftSwapRequestEntity>
  implements ShiftSwapRequestRepository
{
  /**
   * @param swapModel - Mongoose model of the `shift_swap_requests` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(ShiftSwapRequestEntity.name, MONGO_MAIN_CONNECTION)
    swapModel: Model<ShiftSwapRequestEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(swapModel, transactions, changes, {
      name: 'ShiftSwapRequestRepository',
      entityType: 'shift_swap_request',
      classification: ShiftSwapRequestClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'status',
        'counterpart_accepted_at',
        'decision',
        'resulting_assignment_ids',
      ],
    })
  }

  /**
   * Finds requests, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The requests.
   */
  async findByFilter(
    tenantId: string,
    query: SwapQuery = {},
  ): Promise<ShiftSwapRequest[]> {
    const operation = 'ShiftSwapRequestRepository.findByFilter'
    if (
      !toObjectId(tenantId) ||
      (query.unitId !== undefined && !toObjectId(query.unitId)) ||
      (query.rosterId !== undefined && !toObjectId(query.rosterId)) ||
      (query.employeeId !== undefined && !toObjectId(query.employeeId))
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
            ...(query.rosterId ? { roster_id: query.rosterId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.employeeId
              ? {
                  $or: [
                    { 'requester.employee_id': query.employeeId },
                    { 'counterpart.employee_id': query.employeeId },
                  ],
                }
              : {}),
          }),
        )
        .sort({ created_at: -1, _id: -1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<ShiftSwapRequestEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the open requests that name any of the assignments.
   *
   * @param tenantId - Tenant to search in.
   * @param assignmentIds - The assignments.
   * @returns The open requests.
   */
  async findOpenByAssignments(
    tenantId: string,
    assignmentIds: string[],
  ): Promise<ShiftSwapRequest[]> {
    const operation = 'ShiftSwapRequestRepository.findOpenByAssignments'
    if (
      !toObjectId(tenantId) ||
      assignmentIds.length === 0 ||
      assignmentIds.some((id) => !toObjectId(id))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            status: { $in: ['requested', 'accepted_by_counterpart'] },
            $or: [
              { 'requester.assignment_id': { $in: assignmentIds } },
              { 'counterpart.assignment_id': { $in: assignmentIds } },
            ],
          }),
        )
        .lean<LeanRecord<ShiftSwapRequestEntity>[]>()
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
   * @returns The request.
   */
  protected toModel(
    record: LeanRecord<ShiftSwapRequestEntity>,
  ): ShiftSwapRequest {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      unit_id: record.unit_id.toHexString(),
      roster_id: record.roster_id.toHexString(),
      requester: toParty(record.requester),
      counterpart: record.counterpart ? toParty(record.counterpart) : null,
      reason: record.reason,
      status: record.status,
      counterpart_accepted_at: record.counterpart_accepted_at ?? null,
      decision: record.decision
        ? {
            by: record.decision.by,
            at: record.decision.at,
            reason: record.decision.reason ?? null,
          }
        : null,
      resulting_assignment_ids: (record.resulting_assignment_ids ?? []).map(
        (id) => id.toHexString(),
      ),
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
