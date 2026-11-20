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
  type LeaveRequestQuery,
  type LeaveRequestRepository,
  type WaitingFor,
} from '@repository/interface/leave-request'
import { type Coding } from '@repository/model/common/coding'
import {
  LeaveRequest,
  type LeaveRequestStatus,
} from '@repository/model/leave-request'
import { LeaveRequestClassification } from '@repository/model/leave-request.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { LeaveRequestEntity } from './schema/leave-request'

/**
 * Statuses whose days are reserved while a decision is waiting.
 */
const PENDING: LeaveRequestStatus[] = ['requested', 'head_approved']

/**
 * Turns an identifier of a nullable field into a string.
 *
 * @param id - Stored identifier, or `null` or `undefined`.
 * @returns The hex string, or `null`.
 */
function hex(id: { toHexString(): string } | null | undefined): string | null {
  return id ? id.toHexString() : null
}

/**
 * Mongo implementation of `LeaveRequestRepository`. Requests are never deleted. The requester, the
 * unit and the facility are fixed after creation; the status, the decisions, the days and what the
 * later steps change are updatable (the services decide when).
 */
@Injectable()
export class LeaveRequestRepositoryMongo
  extends MongoRepositoryBase<LeaveRequest, LeaveRequestEntity>
  implements LeaveRequestRepository
{
  /**
   * @param requestModel - Mongoose model of the `leave_requests` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(LeaveRequestEntity.name, MONGO_MAIN_CONNECTION)
    requestModel: Model<LeaveRequestEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(requestModel, transactions, changes, {
      name: 'LeaveRequestRepository',
      entityType: 'leave_request',
      classification: LeaveRequestClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'status',
        'status_since',
        'days',
        'total_days',
        'period',
        'leave_type',
        'policy_id',
        'rules',
        'entitlement_period',
        'replacement',
        'decisions',
        'deciders',
        'proof_due_on',
        'proof_received',
        'cover',
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
    query: LeaveRequestQuery = {},
  ): Promise<LeaveRequest[]> {
    if (
      !toObjectId(tenantId) ||
      (query.employeeId !== undefined && !toObjectId(query.employeeId)) ||
      (query.unitId !== undefined && !toObjectId(query.unitId))
    ) {
      return []
    }
    return this.run('findByFilter', {
      tenant_id: tenantId,
      deleted_at: null,
      ...(query.employeeId ? { employee_id: query.employeeId } : {}),
      ...(query.unitId ? { unit_id: query.unitId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.to ? { 'period.start': { $lte: query.to } } : {}),
      ...(query.from ? { 'period.end': { $gte: query.from } } : {}),
      ...(query.proofOverdueBefore
        ? {
            proof_received: false,
            proof_due_on: { $lt: query.proofOverdueBefore, $ne: null },
          }
        : {}),
    }, query.limit ?? DEFAULT_PAGE_SIZE, query.offset ?? 0)
  }

  /**
   * Finds the requests of an employee that share a date with a range.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param start - First date of the range.
   * @param end - Last date of the range.
   * @param statuses - Only requests in these statuses.
   * @returns The requests.
   */
  async findOverlapping(
    tenantId: string,
    employeeId: string,
    start: string,
    end: string,
    statuses: LeaveRequestStatus[],
  ): Promise<LeaveRequest[]> {
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    return this.run('findOverlapping', {
      tenant_id: tenantId,
      employee_id: employeeId,
      status: { $in: statuses },
      'period.start': { $lte: end },
      'period.end': { $gte: start },
      deleted_at: null,
    })
  }

  /**
   * Finds the requests that wait for a decision for an employee, leave type and entitlement period.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param leaveType - The leave type.
   * @param periodStart - First day of the entitlement period.
   * @returns The requests.
   */
  async findPendingByEmployeeTypeAndPeriod(
    tenantId: string,
    employeeId: string,
    leaveType: Coding,
    periodStart: string,
  ): Promise<LeaveRequest[]> {
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    return this.run('findPendingByEmployeeTypeAndPeriod', {
      tenant_id: tenantId,
      employee_id: employeeId,
      'leave_type.system': leaveType.system,
      'leave_type.code': leaveType.code,
      'entitlement_period.start': periodStart,
      status: { $in: PENDING },
      deleted_at: null,
    })
  }

  /**
   * Tells whether any request was made under a policy version.
   *
   * @param tenantId - Tenant to search in.
   * @param policyId - The policy version.
   * @returns True when a request has this `policy_id`.
   */
  async findAnyByPolicy(tenantId: string, policyId: string): Promise<boolean> {
    if (!toObjectId(tenantId) || !toObjectId(policyId)) {
      return false
    }
    const found = await this.run(
      'findAnyByPolicy',
      { tenant_id: tenantId, policy_id: policyId, deleted_at: null },
      1,
    )
    return found.length > 0
  }

  /**
   * Finds the approved requests of an employee whose period holds a date.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param date - The local date.
   * @returns The requests.
   */
  async findApprovedCovering(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<LeaveRequest[]> {
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    return this.run('findApprovedCovering', {
      tenant_id: tenantId,
      employee_id: employeeId,
      status: 'approved',
      'period.start': { $lte: date },
      'period.end': { $gte: date },
      deleted_at: null,
    })
  }

  /**
   * Finds the requests that wait for a decision of the given people, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param waiting - The units whose Head is asking and whether HR Manager is.
   * @param limit - Page size.
   * @param offset - Items to skip.
   * @returns The requests; none when the asker decides nothing.
   */
  async findWaiting(
    tenantId: string,
    waiting: WaitingFor,
    limit: number,
    offset: number,
  ): Promise<LeaveRequest[]> {
    if (
      !toObjectId(tenantId) ||
      waiting.unitIds.some((id) => !toObjectId(id))
    ) {
      return []
    }
    const clauses: Record<string, unknown>[] = []
    if (waiting.unitIds.length > 0) {
      clauses.push({
        status: 'requested',
        'deciders.first.kind': { $in: ['unit_head', 'parent_head'] },
        'deciders.first.unit_id': { $in: waiting.unitIds },
      })
    }
    if (waiting.hr) {
      clauses.push(
        { status: 'requested', 'deciders.first.kind': 'hr_manager' },
        { status: 'head_approved' },
      )
    }
    if (clauses.length === 0) {
      return []
    }
    return this.run(
      'findWaiting',
      { tenant_id: tenantId, deleted_at: null, $or: clauses },
      limit,
      offset,
    )
  }

  /**
   * Runs a named read, latest first.
   *
   * @param name - Method name for the operation label.
   * @param filter - Filter on model fields.
   * @param limit - Page size, or `undefined` for all.
   * @param skip - Items to skip.
   * @returns The requests.
   */
  private async run(
    name: string,
    filter: Record<string, unknown>,
    limit?: number,
    skip = 0,
  ): Promise<LeaveRequest[]> {
    const operation = `LeaveRequestRepository.${name}`
    try {
      let query = this.model
        .find(this.toFilter(filter))
        .sort({ created_at: -1, _id: -1 })
        .skip(skip)
      if (limit !== undefined) {
        query = query.limit(limit)
      }
      const records = await query
        .lean<LeanRecord<LeaveRequestEntity>[]>()
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
   * @returns The leave request.
   */
  protected toModel(record: LeanRecord<LeaveRequestEntity>): LeaveRequest {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      unit_id: hex(record.unit_id),
      facility_id: hex(record.facility_id),
      leave_type: {
        system: record.leave_type.system,
        code: record.leave_type.code,
      },
      policy_id: record.policy_id.toHexString(),
      rules: {
        balance_kind: record.rules.balance_kind,
        counting: record.rules.counting,
        steps: record.rules.steps,
      },
      period: { start: record.period.start, end: record.period.end },
      half_days: {
        first: record.half_days.first,
        last: record.half_days.last,
      },
      days: (record.days ?? []).map((day) => ({
        date: day.date,
        count: day.count,
        why: day.why,
        set_by: day.set_by,
      })),
      total_days: record.total_days,
      entitlement_period: record.entitlement_period
        ? {
            start: record.entitlement_period.start,
            end: record.entitlement_period.end,
          }
        : null,
      deciders: {
        first: {
          kind: record.deciders.first.kind,
          unit_id: hex(record.deciders.first.unit_id),
          employee_id: hex(record.deciders.first.employee_id),
        },
        second: record.deciders.second,
      },
      replacement: record.replacement
        ? {
            employee_id: hex(record.replacement.employee_id),
            none_reason: record.replacement.none_reason ?? null,
          }
        : null,
      decisions: (record.decisions ?? []).map((decision) => ({
        step: decision.step,
        outcome: decision.outcome,
        by: decision.by,
        at: decision.at,
        reason: decision.reason ?? null,
      })),
      status: record.status,
      status_since: record.status_since,
      proof_due_on: record.proof_due_on ?? null,
      proof_received: record.proof_received,
      cover: record.cover
        ? {
            cancelled_assignment_ids: (record.cover.cancelled_assignment_ids ?? []).map((id) => id.toHexString()),
            confirmed: record.cover.confirmed
              ? {
                  by: record.cover.confirmed.by,
                  at: record.cover.confirmed.at,
                  created_assignment_ids: (record.cover.confirmed.created_assignment_ids ?? []).map((id) => id.toHexString()),
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
}
