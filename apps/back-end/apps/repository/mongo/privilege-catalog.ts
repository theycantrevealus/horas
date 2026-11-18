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
  type PrivilegeCatalogRepository,
  type PrivilegeQuery,
} from '@repository/interface/privilege-catalog'
import { PrivilegeCatalogItem } from '@repository/model/privilege-catalog-item'
import { PrivilegeCatalogItemClassification } from '@repository/model/privilege-catalog-item.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { PrivilegeCatalogEntity } from './schema/privilege-catalog'

/**
 * Mongo implementation of `PrivilegeCatalogRepository`. Items are never deleted. The code and
 * the committee are fixed after creation; the rest can change while an item is active.
 */
@Injectable()
export class PrivilegeCatalogRepositoryMongo
  extends MongoRepositoryBase<PrivilegeCatalogItem, PrivilegeCatalogEntity>
  implements PrivilegeCatalogRepository
{
  /**
   * @param catalogModel - Mongoose model of the `privilege_catalog_items` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(PrivilegeCatalogEntity.name, MONGO_MAIN_CONNECTION)
    catalogModel: Model<PrivilegeCatalogEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(catalogModel, transactions, changes, {
      name: 'PrivilegeCatalogRepository',
      entityType: 'privilege_catalog_item',
      classification: PrivilegeCatalogItemClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'name',
        'description',
        'professions',
        'specialties',
        'min_clinical_level',
        'required_evidence',
        'external_codes',
        'facility_ids',
        'status',
      ],
    })
  }

  /**
   * Finds an item by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Catalog code.
   * @returns The item, or `null`.
   */
  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<PrivilegeCatalogItem | null> {
    const operation = 'PrivilegeCatalogRepository.findByCode'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ tenant_id: tenantId, code, deleted_at: null }))
        .lean<LeanRecord<PrivilegeCatalogEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds catalog items ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The items.
   */
  async findByFilter(
    tenantId: string,
    query: PrivilegeQuery = {},
  ): Promise<PrivilegeCatalogItem[]> {
    const operation = 'PrivilegeCatalogRepository.findByFilter'
    if (
      !toObjectId(tenantId) ||
      (query.facilityId !== undefined && !toObjectId(query.facilityId))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.committee ? { 'committee.code': query.committee } : {}),
            ...(query.profession ? { 'professions.code': query.profession } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.facilityId
              ? {
                  $or: [
                    { facility_ids: { $size: 0 } },
                    { facility_ids: query.facilityId },
                  ],
                }
              : {}),
          }),
        )
        .sort({ code: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<PrivilegeCatalogEntity>[]>()
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
   * @returns The item.
   */
  protected toModel(
    record: LeanRecord<PrivilegeCatalogEntity>,
  ): PrivilegeCatalogItem {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      facility_ids: record.facility_ids.map((id) => id.toHexString()),
      code: record.code,
      name: record.name.map(({ locale, text }) => ({ locale, text })),
      description: record.description.map(({ locale, text }) => ({
        locale,
        text,
      })),
      committee: toCoding(record.committee),
      professions: record.professions.map(toCoding),
      specialties: record.specialties.map(toCoding),
      min_clinical_level: record.min_clinical_level
        ? toCoding(record.min_clinical_level)
        : null,
      required_evidence: record.required_evidence.map((item) => ({
        type: toCoding(item.type),
        description: item.description.map(({ locale, text }) => ({
          locale,
          text,
        })),
        mandatory: item.mandatory,
      })),
      external_codes: record.external_codes.map(toCoding),
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
