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
import { type OrganizationRepository } from '@repository/interface/organization'
import { Organization } from '@repository/model/organization'
import { OrganizationClassification } from '@repository/model/organization.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { OrganizationEntity } from './schema/organization'

/**
 * Mongo implementation of `OrganizationRepository`. Organizations are never deleted, only set
 * inactive. `code` and `country` cannot be changed after creation: they are not updatable fields.
 */
@Injectable()
export class OrganizationRepositoryMongo
  extends MongoRepositoryBase<Organization, OrganizationEntity>
  implements OrganizationRepository
{
  /**
   * @param organizationModel - Mongoose model of the `organizations` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(OrganizationEntity.name, MONGO_MAIN_CONNECTION)
    organizationModel: Model<OrganizationEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(organizationModel, transactions, changes, {
      name: 'OrganizationRepository',
      entityType: 'organization',
      classification: OrganizationClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['legal_name', 'currency', 'identifiers', 'status'],
    })
  }

  /**
   * Finds an organization by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Organization code, unique inside the tenant.
   * @returns The organization, or `null` when none matches.
   */
  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<Organization | null> {
    const operation = 'OrganizationRepository.findByCode'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ tenant_id: tenantId, code, deleted_at: null }))
        .lean<LeanRecord<OrganizationEntity>>()
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
   * @returns The organization.
   */
  protected toModel(record: LeanRecord<OrganizationEntity>): Organization {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      code: record.code,
      legal_name: record.legal_name,
      country: record.country,
      identifiers: record.identifiers.map(({ system, value }) => ({
        system,
        value,
      })),
      currency: record.currency,
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
