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
  type GrantQuery,
  type PrivilegeGrantRepository,
} from '@repository/interface/privilege-grant'
import { PrivilegeGrant } from '@repository/model/privilege-grant'
import { PrivilegeGrantClassification } from '@repository/model/privilege-grant.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { PrivilegeGrantEntity } from './schema/privilege-grant'

/**
 * Mongo implementation of `PrivilegeGrantRepository`. Grants are never deleted. Only the status,
 * the latest status change and the flag change after the grant is issued, and the supervisor, which
 * is re-pointed to the supervisor's new grant when the supervisor's SPK is renewed (HR plan 4.4 RN11).
 */
@Injectable()
export class PrivilegeGrantRepositoryMongo
  extends MongoRepositoryBase<PrivilegeGrant, PrivilegeGrantEntity>
  implements PrivilegeGrantRepository
{
  /**
   * @param grantModel - Mongoose model of the `privilege_grants` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(PrivilegeGrantEntity.name, MONGO_MAIN_CONNECTION)
    grantModel: Model<PrivilegeGrantEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(grantModel, transactions, changes, {
      name: 'PrivilegeGrantRepository',
      entityType: 'privilege_grant',
      classification: PrivilegeGrantClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['status', 'status_change', 'flag', 'supervisor'],
    })
  }

  /**
   * Finds the grants of an appointment, ordered by privilege code.
   *
   * @param tenantId - Tenant to search in.
   * @param appointmentId - The SPK.
   * @returns The grants.
   */
  async findByAppointment(
    tenantId: string,
    appointmentId: string,
  ): Promise<PrivilegeGrant[]> {
    const operation = 'PrivilegeGrantRepository.findByAppointment'
    if (!toObjectId(tenantId) || !toObjectId(appointmentId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            appointment_id: appointmentId,
          }),
        )
        .sort({ code: 1, _id: 1 })
        .lean<LeanRecord<PrivilegeGrantEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds grants for the privilege directory, ordered by privilege code.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The grants.
   */
  async findByFilter(
    tenantId: string,
    query: GrantQuery = {},
  ): Promise<PrivilegeGrant[]> {
    const operation = 'PrivilegeGrantRepository.findByFilter'
    const ids = [
      query.catalogItemId,
      query.employeeId,
      query.appointmentId,
      query.facilityId,
      query.unitId,
    ].filter((id): id is string => id !== undefined)
    if (!toObjectId(tenantId) || ids.some((id) => !toObjectId(id))) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.catalogItemId ? { catalog_item_id: query.catalogItemId } : {}),
            ...(query.employeeId ? { employee_id: query.employeeId } : {}),
            ...(query.appointmentId ? { appointment_id: query.appointmentId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.condition ? { condition: query.condition } : {}),
            ...(query.facilityId ? { facility_ids: query.facilityId } : {}),
            ...(query.unitId ? { unit_ids: query.unitId } : {}),
            ...(query.flagged === true
              ? { flag: { $ne: null }, 'flag.resolved_at': null }
              : {}),
            ...(query.flagged === false
              ? {
                  $or: [
                    { flag: null },
                    { 'flag.resolved_at': { $ne: null } },
                  ],
                }
              : {}),
          }),
        )
        .sort({ code: 1, _id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<PrivilegeGrantEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the grants that name a grant as their supervisor's grant.
   *
   * @param tenantId - Tenant to search in.
   * @param grantId - The supervisor's own grant.
   * @returns The supervised grants.
   */
  async findBySupervisorGrant(
    tenantId: string,
    grantId: string,
  ): Promise<PrivilegeGrant[]> {
    const operation = 'PrivilegeGrantRepository.findBySupervisorGrant'
    if (!toObjectId(tenantId) || !toObjectId(grantId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            'supervisor.grant_id': grantId,
          }),
        )
        .sort({ code: 1, _id: 1 })
        .lean<LeanRecord<PrivilegeGrantEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds an active full grant of a privilege held by an employee in a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param catalogItemId - The privilege.
   * @param employeeId - The would-be supervisor.
   * @param facilityId - A facility the grant must cover.
   * @returns The grant, or `null`.
   */
  async findActiveFullGrant(
    tenantId: string,
    catalogItemId: string,
    employeeId: string,
    facilityId: string,
  ): Promise<PrivilegeGrant | null> {
    const operation = 'PrivilegeGrantRepository.findActiveFullGrant'
    if (
      [tenantId, catalogItemId, employeeId, facilityId].some(
        (id) => !toObjectId(id),
      )
    ) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            catalog_item_id: catalogItemId,
            employee_id: employeeId,
            facility_ids: facilityId,
            status: 'active',
            condition: 'full',
          }),
        )
        .lean<LeanRecord<PrivilegeGrantEntity>>()
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
   * @returns The grant.
   */
  protected toModel(record: LeanRecord<PrivilegeGrantEntity>): PrivilegeGrant {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      appointment_id: record.appointment_id.toHexString(),
      employee_id: record.employee_id.toHexString(),
      facility_ids: record.facility_ids.map((id) => id.toHexString()),
      unit_ids: record.unit_ids.map((id) => id.toHexString()),
      catalog_item_id: record.catalog_item_id.toHexString(),
      code: record.code,
      condition: record.condition,
      supervisor: record.supervisor
        ? {
            employee_id: record.supervisor.employee_id.toHexString(),
            grant_id: record.supervisor.grant_id.toHexString(),
          }
        : null,
      restriction_notes: record.restriction_notes,
      status: record.status,
      status_change: record.status_change,
      flag: record.flag,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
