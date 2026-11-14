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
  type LicenseQuery,
  type ProfessionalLicenseRepository,
} from '@repository/interface/professional-license'
import { ProfessionalLicense } from '@repository/model/professional-license'
import { ProfessionalLicenseClassification } from '@repository/model/professional-license.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { ProfessionalLicenseEntity } from './schema/professional-license'

/**
 * Mongo implementation of `ProfessionalLicenseRepository`. Licences are never deleted. The
 * employee, type, profession, number, dates and document are fixed after registration; only the
 * status and its supporting records change (`HR-LIC-008`).
 */
@Injectable()
export class ProfessionalLicenseRepositoryMongo
  extends MongoRepositoryBase<ProfessionalLicense, ProfessionalLicenseEntity>
  implements ProfessionalLicenseRepository
{
  /**
   * @param licenseModel - Mongoose model of the `professional_licenses` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(ProfessionalLicenseEntity.name, MONGO_MAIN_CONNECTION)
    licenseModel: Model<ProfessionalLicenseEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(licenseModel, transactions, changes, {
      name: 'ProfessionalLicenseRepository',
      entityType: 'professional_license',
      classification: ProfessionalLicenseClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'status',
        'status_effective_date',
        'is_live',
        'verification',
        'rejection',
        'revocation',
        'superseded',
      ],
    })
  }

  /**
   * Finds every licence of an employee, newest issue date first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The licences.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<ProfessionalLicense[]> {
    return this.findMany(
      'findByEmployee',
      [tenantId, employeeId],
      { tenant_id: tenantId, employee_id: employeeId },
      { issue_date: -1, _id: 1 },
    )
  }

  /**
   * Finds licences of the tenant with optional filters and paging.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The licences.
   */
  async findByFilter(
    tenantId: string,
    query: LicenseQuery = {},
  ): Promise<ProfessionalLicense[]> {
    const expiry =
      query.expiresFrom !== undefined || query.expiresTo !== undefined
    return this.findMany(
      'findByFilter',
      [tenantId, ...(query.facilityId ? [query.facilityId] : [])],
      {
        tenant_id: tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.licenseType ? { 'license_type.code': query.licenseType } : {}),
        ...(query.facilityId
          ? { 'practice_location.facility_id': query.facilityId }
          : {}),
        ...(expiry
          ? {
              expiry_date: {
                ...(query.expiresFrom !== undefined
                  ? { $gte: query.expiresFrom }
                  : {}),
                ...(query.expiresTo !== undefined
                  ? { $lte: query.expiresTo }
                  : {}),
              },
            }
          : {}),
      },
      expiry ? { expiry_date: 1, _id: 1 } : { _id: 1 },
      query.limit ?? DEFAULT_PAGE_SIZE,
      query.offset ?? 0,
    )
  }

  /**
   * Finds the live licence with a document number and type.
   *
   * @param tenantId - Tenant to search in.
   * @param typeSystem - Licence type system.
   * @param typeCode - Licence type code.
   * @param normalizedNumber - Normalized document number.
   * @returns The licence, or `null`.
   */
  async findLiveByNumber(
    tenantId: string,
    typeSystem: string,
    typeCode: string,
    normalizedNumber: string,
  ): Promise<ProfessionalLicense | null> {
    const operation = 'ProfessionalLicenseRepository.findLiveByNumber'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            'license_type.system': typeSystem,
            'license_type.code': typeCode,
            document_number_normalized: normalizedNumber,
            is_live: true,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<ProfessionalLicenseEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The licence.
   */
  protected toModel(
    record: LeanRecord<ProfessionalLicenseEntity>,
  ): ProfessionalLicense {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      license_type: toCoding(record.license_type),
      eligibility_role: record.eligibility_role,
      profession: toCoding(record.profession),
      specialty: record.specialty ? toCoding(record.specialty) : null,
      document_number: record.document_number,
      document_number_normalized: record.document_number_normalized,
      issuing_authority: {
        code: record.issuing_authority.code
          ? toCoding(record.issuing_authority.code)
          : null,
        name: record.issuing_authority.name,
      },
      jurisdiction: {
        country: record.jurisdiction.country,
        subdivision: record.jurisdiction.subdivision,
      },
      practice_location: record.practice_location
        ? {
            facility_id: record.practice_location.facility_id
              ? record.practice_location.facility_id.toHexString()
              : null,
            name: record.practice_location.name,
            address: record.practice_location.address,
          }
        : null,
      issue_date: record.issue_date,
      expiry_date: record.expiry_date,
      document: {
        file_id: record.document.file_id,
        content_type: record.document.content_type,
        sha256: record.document.sha256,
      },
      status: record.status,
      status_effective_date: record.status_effective_date,
      is_live: record.is_live,
      submission: {
        via: record.submission.via,
        by: record.submission.by,
        at: record.submission.at,
      },
      verification: record.verification,
      rejection: record.rejection,
      revocation: record.revocation,
      superseded: record.superseded,
      replaces_license_id: record.replaces_license_id
        ? record.replaces_license_id.toHexString()
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
   * @returns The licences.
   */
  private async findMany(
    name: string,
    ids: string[],
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    limit?: number,
    skip = 0,
  ): Promise<ProfessionalLicense[]> {
    const operation = `ProfessionalLicenseRepository.${name}`
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
        .lean<LeanRecord<ProfessionalLicenseEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }
}
