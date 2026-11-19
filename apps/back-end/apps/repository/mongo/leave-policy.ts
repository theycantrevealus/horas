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
  type LeavePolicyQuery,
  type LeavePolicyRepository,
} from '@repository/interface/leave-policy'
import { type Coding } from '@repository/model/common/coding'
import {
  type LeaveBalanceRule,
  LeavePolicy,
} from '@repository/model/leave-policy'
import { LeavePolicyClassification } from '@repository/model/leave-policy.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import {
  type LeaveBalanceRuleEntity,
  LeavePolicyEntity,
} from './schema/leave-policy'

/**
 * Copies a stored coding to the model.
 *
 * @param coding - Stored coding.
 * @returns The coding with the fields of the model.
 */
function toCoding(coding: Coding): Coding {
  return { system: coding.system, code: coding.code }
}

/**
 * Maps a stored balance rule to the model, keeping only the fields of its kind.
 *
 * @param rule - Stored balance rule.
 * @returns The balance rule of the model.
 */
function toBalanceRule(rule: LeaveBalanceRuleEntity): LeaveBalanceRule {
  if (rule.kind === 'period') {
    return {
      kind: 'period',
      period: rule.period ?? 'calendar_year',
      days: rule.days ?? 0,
      min_service_months: rule.min_service_months ?? 0,
      carry_over: rule.carry_over
        ? {
            max_days: rule.carry_over.max_days,
            expires_after_months: rule.carry_over.expires_after_months,
          }
        : null,
      deduct_collective_leave: rule.deduct_collective_leave ?? false,
    }
  }
  if (rule.kind === 'per_event') {
    return { kind: 'per_event', days: rule.days ?? 0 }
  }
  return { kind: 'none' }
}

/**
 * Mongo implementation of `LeavePolicyRepository`. Policies are never deleted. The leave type, the
 * start date and the source are fixed after creation; the rules can change (the service allows it
 * only before the version is in force).
 */
@Injectable()
export class LeavePolicyRepositoryMongo
  extends MongoRepositoryBase<LeavePolicy, LeavePolicyEntity>
  implements LeavePolicyRepository
{
  /**
   * @param policyModel - Mongoose model of the `leave_policies` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(LeavePolicyEntity.name, MONGO_MAIN_CONNECTION)
    policyModel: Model<LeavePolicyEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(policyModel, transactions, changes, {
      name: 'LeavePolicyRepository',
      entityType: 'leave_policy',
      classification: LeavePolicyClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'balance',
        'counting',
        'half_days',
        'paid',
        'employment_types',
        'approval',
        'notice_days',
        'retroactive_days',
        'max_days_per_request',
        'proof',
        'notes',
      ],
    })
  }

  /**
   * Finds policy versions, ordered by leave type code and then `effective_from`, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The policy versions.
   */
  async findByFilter(
    tenantId: string,
    query: LeavePolicyQuery = {},
  ): Promise<LeavePolicy[]> {
    const operation = 'LeavePolicyRepository.findByFilter'
    if (!toObjectId(tenantId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.leaveTypeSystem
              ? { 'leave_type.system': query.leaveTypeSystem }
              : {}),
            ...(query.leaveTypeCode
              ? { 'leave_type.code': query.leaveTypeCode }
              : {}),
          }),
        )
        .sort({ 'leave_type.code': 1, effective_from: -1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<LeavePolicyEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the version of a leave type in force on a date.
   *
   * @param tenantId - Tenant to search in.
   * @param leaveType - The leave type.
   * @param date - Local date.
   * @returns The version, or `null`.
   */
  async findInForce(
    tenantId: string,
    leaveType: Coding,
    date: string,
  ): Promise<LeavePolicy | null> {
    const operation = 'LeavePolicyRepository.findInForce'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            'leave_type.system': leaveType.system,
            'leave_type.code': leaveType.code,
            effective_from: { $lte: date },
            deleted_at: null,
          }),
        )
        .sort({ effective_from: -1 })
        .limit(1)
        .lean<LeanRecord<LeavePolicyEntity>[]>()
        .exec()
      const record = records[0]
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the version of a leave type that starts on a date.
   *
   * @param tenantId - Tenant to search in.
   * @param leaveType - The leave type.
   * @param effectiveFrom - Local date the version starts.
   * @returns The version, or `null`.
   */
  async findByTypeAndDate(
    tenantId: string,
    leaveType: Coding,
    effectiveFrom: string,
  ): Promise<LeavePolicy | null> {
    const operation = 'LeavePolicyRepository.findByTypeAndDate'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            'leave_type.system': leaveType.system,
            'leave_type.code': leaveType.code,
            effective_from: effectiveFrom,
            deleted_at: null,
          }),
        )
        .limit(1)
        .lean<LeanRecord<LeavePolicyEntity>[]>()
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
   * @returns The leave policy.
   */
  protected toModel(record: LeanRecord<LeavePolicyEntity>): LeavePolicy {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      leave_type: toCoding(record.leave_type),
      effective_from: record.effective_from,
      balance: toBalanceRule(record.balance),
      counting: record.counting,
      half_days: record.half_days,
      paid: record.paid,
      employment_types: (record.employment_types ?? []).map(toCoding),
      approval: {
        steps: record.approval.steps,
        two_step_above_days: record.approval.two_step_above_days ?? null,
      },
      notice_days: record.notice_days,
      retroactive_days: record.retroactive_days,
      max_days_per_request: record.max_days_per_request,
      proof: record.proof ? { due_days: record.proof.due_days } : null,
      notes: record.notes ?? null,
      source: {
        kind: record.source.kind,
        bundle_id: record.source.bundle_id ?? null,
      },
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
