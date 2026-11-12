import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type FacilityRepository } from '@repository/interface/facility'
import { type Address } from '@repository/model/common/address'
import { Facility } from '@repository/model/facility'
import { FacilityClassification } from '@repository/model/facility.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { type AddressEntity } from './schema/common/address'
import { FacilityEntity } from './schema/facility'

/**
 * Maps a stored address to the model, copying only model fields.
 *
 * @param record - Stored address, or `null`.
 * @returns The address, or `null`.
 */
export function toAddress(
  record: AddressEntity | null | undefined,
): Address | null {
  if (!record) {
    return null
  }
  return {
    use: record.use,
    lines: [...record.lines],
    admin_levels: record.admin_levels.map(({ level, code, name }) => ({
      level,
      ...(code === undefined ? {} : { code }),
      name,
    })),
    ...(record.city === undefined ? {} : { city: record.city }),
    ...(record.subdivision === undefined
      ? {}
      : { subdivision: record.subdivision }),
    ...(record.postal_code === undefined
      ? {}
      : { postal_code: record.postal_code }),
    country: record.country,
  }
}

/**
 * Mongo implementation of `FacilityRepository`. Facilities are never deleted, only set
 * inactive. `organization_id`, `code` and `timezone` cannot be changed after creation: they are
 * not updatable fields, because every stored local date and time of the facility is read in its
 * time zone.
 */
@Injectable()
export class FacilityRepositoryMongo
  extends MongoRepositoryBase<Facility, FacilityEntity>
  implements FacilityRepository
{
  /**
   * @param facilityModel - Mongoose model of the `facilities` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(FacilityEntity.name, MONGO_MAIN_CONNECTION)
    facilityModel: Model<FacilityEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(facilityModel, transactions, changes, {
      name: 'FacilityRepository',
      entityType: 'facility',
      classification: FacilityClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'name',
        'address',
        'holiday_calendar_codes',
        'external_ids',
        'status',
      ],
    })
  }

  /**
   * Finds a facility by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Facility code, unique inside the tenant.
   * @returns The facility, or `null` when none matches.
   */
  async findByCode(tenantId: string, code: string): Promise<Facility | null> {
    const operation = 'FacilityRepository.findByCode'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ tenant_id: tenantId, code, deleted_at: null }))
        .lean<LeanRecord<FacilityEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the active facilities of an organization.
   *
   * @param tenantId - Tenant to search in.
   * @param organizationId - Organization that runs the facilities.
   * @returns The active facilities, possibly none.
   */
  async findActiveByOrganization(
    tenantId: string,
    organizationId: string,
  ): Promise<Facility[]> {
    const operation = 'FacilityRepository.findActiveByOrganization'
    if (!toObjectId(tenantId) || !toObjectId(organizationId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            organization_id: organizationId,
            status: 'active',
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<FacilityEntity>[]>()
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
   * @returns The facility.
   */
  protected toModel(record: LeanRecord<FacilityEntity>): Facility {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      organization_id: record.organization_id.toHexString(),
      code: record.code,
      name: record.name.map(({ locale, text }) => ({ locale, text })),
      address: toAddress(record.address),
      timezone: record.timezone,
      holiday_calendar_codes: [...record.holiday_calendar_codes],
      external_ids: record.external_ids.map(({ system, value }) => ({
        system,
        value,
      })),
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
