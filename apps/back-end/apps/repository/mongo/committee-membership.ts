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
  type CommitteeMembershipRepository,
  type FacilityMembershipQuery,
} from '@repository/interface/committee-membership'
import { CommitteeMembership } from '@repository/model/committee-membership'
import { CommitteeMembershipClassification } from '@repository/model/committee-membership.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { CommitteeMembershipEntity } from './schema/committee-membership'

/**
 * Mongo implementation of `CommitteeMembershipRepository`. Memberships are never deleted. Only
 * the status and the period can change after creation, so ending a membership is the one update.
 */
@Injectable()
export class CommitteeMembershipRepositoryMongo
  extends MongoRepositoryBase<CommitteeMembership, CommitteeMembershipEntity>
  implements CommitteeMembershipRepository
{
  /**
   * @param membershipModel - Mongoose model of the `committee_memberships` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(CommitteeMembershipEntity.name, MONGO_MAIN_CONNECTION)
    membershipModel: Model<CommitteeMembershipEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(membershipModel, transactions, changes, {
      name: 'CommitteeMembershipRepository',
      entityType: 'committee_membership',
      classification: CommitteeMembershipClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['status', 'period'],
    })
  }

  /**
   * Finds the memberships of a facility's committees.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param query - Optional filters and paging.
   * @returns The memberships.
   */
  async findByFacility(
    tenantId: string,
    facilityId: string,
    query: FacilityMembershipQuery = {},
  ): Promise<CommitteeMembership[]> {
    const operation = 'CommitteeMembershipRepository.findByFacility'
    if (!toObjectId(tenantId) || !toObjectId(facilityId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            facility_id: facilityId,
            deleted_at: null,
            ...(query.committee ? { 'committee.code': query.committee } : {}),
            ...(query.role ? { 'role.code': query.role } : {}),
            ...(query.status ? { status: query.status } : {}),
          }),
        )
        .sort({ 'committee.code': 1, 'period.start': 1, _id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<CommitteeMembershipEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the active membership of an employee in one committee of a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param facilityId - The facility.
   * @param committeeCode - Committee code.
   * @returns The active membership, or `null`.
   */
  async findActiveForEmployee(
    tenantId: string,
    employeeId: string,
    facilityId: string,
    committeeCode: string,
  ): Promise<CommitteeMembership | null> {
    return this.findFirst(
      'findActiveForEmployee',
      [tenantId, employeeId, facilityId],
      {
        tenant_id: tenantId,
        employee_id: employeeId,
        facility_id: facilityId,
        'committee.code': committeeCode,
        status: 'active',
      },
    )
  }

  /**
   * Finds the active membership with a given role in one committee of a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param committeeCode - Committee code.
   * @param roleCode - Role code.
   * @returns The first active membership with that role, or `null`.
   */
  async findActiveByRole(
    tenantId: string,
    facilityId: string,
    committeeCode: string,
    roleCode: string,
  ): Promise<CommitteeMembership | null> {
    return this.findFirst('findActiveByRole', [tenantId, facilityId], {
      tenant_id: tenantId,
      facility_id: facilityId,
      'committee.code': committeeCode,
      'role.code': roleCode,
      status: 'active',
    })
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The membership.
   */
  protected toModel(
    record: LeanRecord<CommitteeMembershipEntity>,
  ): CommitteeMembership {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      facility_id: record.facility_id.toHexString(),
      committee: toCoding(record.committee),
      role: toCoding(record.role),
      period: { start: record.period.start, end: record.period.end },
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
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Runs a named read for the first matching, not soft-deleted membership.
   *
   * @param name - Method name for the operation label.
   * @param ids - Identifiers in the filter; a malformed one gives no result.
   * @param filter - Filter on model fields.
   * @returns The membership, or `null`.
   */
  private async findFirst(
    name: string,
    ids: string[],
    filter: Record<string, unknown>,
  ): Promise<CommitteeMembership | null> {
    const operation = `CommitteeMembershipRepository.${name}`
    if (ids.some((value) => !toObjectId(value))) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ ...filter, deleted_at: null }))
        .lean<LeanRecord<CommitteeMembershipEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }
}
