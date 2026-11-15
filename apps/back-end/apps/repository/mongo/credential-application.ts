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
  type ApplicationQuery,
  type CredentialApplicationRepository,
} from '@repository/interface/credential-application'
import { CredentialApplication } from '@repository/model/credential-application'
import { CredentialApplicationClassification } from '@repository/model/credential-application.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { CredentialApplicationEntity } from './schema/credential-application'

/**
 * Mongo implementation of `CredentialApplicationRepository`. Applications are never deleted. The
 * applicant, the credentialing facility, the committee, the scope and the type are fixed after
 * creation; the process changes the rest.
 */
@Injectable()
export class CredentialApplicationRepositoryMongo
  extends MongoRepositoryBase<CredentialApplication, CredentialApplicationEntity>
  implements CredentialApplicationRepository
{
  /**
   * @param applicationModel - Mongoose model of the `credential_applications` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(CredentialApplicationEntity.name, MONGO_MAIN_CONNECTION)
    applicationModel: Model<CredentialApplicationEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(applicationModel, transactions, changes, {
      name: 'CredentialApplicationRepository',
      entityType: 'credential_application',
      classification: CredentialApplicationClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'status',
        'status_since',
        'requested_privileges',
        'requested_unit_ids',
        'requested_facility_ids',
        'documents',
        'assessors',
        'recommendation',
        'decision',
        'return_reason',
        'withdrawal_reason',
        'temporary',
      ],
    })
  }

  /**
   * Finds applications, the oldest status first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The applications.
   */
  async findByFilter(
    tenantId: string,
    query: ApplicationQuery = {},
  ): Promise<CredentialApplication[]> {
    const operation = 'CredentialApplicationRepository.findByFilter'
    if (
      !toObjectId(tenantId) ||
      (query.facilityId !== undefined && !toObjectId(query.facilityId)) ||
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
            ...(query.status ? { status: query.status } : {}),
            ...(query.committee ? { 'committee.code': query.committee } : {}),
            ...(query.facilityId
              ? { credentialing_facility_id: query.facilityId }
              : {}),
            ...(query.employeeId ? { employee_id: query.employeeId } : {}),
            ...(query.statusBefore
              ? { status_since: { $lte: query.statusBefore } }
              : {}),
          }),
        )
        .sort({ status_since: 1, _id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<CredentialApplicationEntity>[]>()
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
   * @returns The application.
   */
  protected toModel(
    record: LeanRecord<CredentialApplicationEntity>,
  ): CredentialApplication {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      credentialing_facility_id: record.credentialing_facility_id.toHexString(),
      credentialing_scope: record.credentialing_scope,
      type: record.type,
      committee: toCoding(record.committee),
      status: record.status,
      status_since: record.status_since,
      requested_privileges: record.requested_privileges.map((item) => ({
        catalog_item_id: item.catalog_item_id.toHexString(),
        code: item.code,
        requested_condition: item.requested_condition,
        proposed_supervisor_employee_id: item.proposed_supervisor_employee_id
          ? item.proposed_supervisor_employee_id.toHexString()
          : null,
        notes: item.notes,
      })),
      requested_unit_ids: record.requested_unit_ids.map((id) =>
        id.toHexString(),
      ),
      requested_facility_ids: record.requested_facility_ids.map((id) =>
        id.toHexString(),
      ),
      documents: record.documents.map((document) => ({
        type: toCoding(document.type),
        file: {
          file_id: document.file.file_id,
          content_type: document.file.content_type,
          sha256: document.file.sha256,
        },
        license_id: document.license_id
          ? document.license_id.toHexString()
          : null,
      })),
      assessors: record.assessors.map((assessor) => ({
        employee_id: assessor.employee_id.toHexString(),
        appointed_at: assessor.appointed_at,
        appointed_by: assessor.appointed_by,
        conflict_declaration: assessor.conflict_declaration,
      })),
      recommendation: record.recommendation,
      decision: record.decision,
      return_reason: record.return_reason,
      withdrawal_reason: record.withdrawal_reason,
      temporary: record.temporary
        ? {
            requested_days: record.temporary.requested_days,
            urgency: toCoding(record.temporary.urgency),
          }
        : null,
      previous_appointment_id: record.previous_appointment_id
        ? record.previous_appointment_id.toHexString()
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
