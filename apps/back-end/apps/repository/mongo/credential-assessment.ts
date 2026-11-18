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
import { type CredentialAssessmentRepository } from '@repository/interface/credential-assessment'
import { CredentialAssessment } from '@repository/model/credential-assessment'
import { CredentialAssessmentClassification } from '@repository/model/credential-assessment.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { CredentialAssessmentEntity } from './schema/credential-assessment'

/**
 * Mongo implementation of `CredentialAssessmentRepository`. Assessments are never edited or
 * deleted: an assessor's finding stays as it was written.
 */
@Injectable()
export class CredentialAssessmentRepositoryMongo
  extends MongoRepositoryBase<CredentialAssessment, CredentialAssessmentEntity>
  implements CredentialAssessmentRepository
{
  /**
   * @param assessmentModel - Mongoose model of the `credential_assessments` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(CredentialAssessmentEntity.name, MONGO_MAIN_CONNECTION)
    assessmentModel: Model<CredentialAssessmentEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(assessmentModel, transactions, changes, {
      name: 'CredentialAssessmentRepository',
      entityType: 'credential_assessment',
      classification: CredentialAssessmentClassification,
      allowUpdate: false,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [],
    })
  }

  /**
   * Finds every assessment of an application, oldest first.
   *
   * @param tenantId - Tenant to search in.
   * @param applicationId - The application.
   * @returns The assessments.
   */
  async findByApplication(
    tenantId: string,
    applicationId: string,
  ): Promise<CredentialAssessment[]> {
    return this.findWhere(
      'CredentialAssessmentRepository.findByApplication',
      tenantId,
      { application_id: applicationId },
    )
  }

  /**
   * Finds the assessments one assessor made of an application.
   *
   * @param tenantId - Tenant to search in.
   * @param applicationId - The application.
   * @param assessorEmployeeId - The assessor.
   * @returns The assessments.
   */
  async findByAssessor(
    tenantId: string,
    applicationId: string,
    assessorEmployeeId: string,
  ): Promise<CredentialAssessment[]> {
    return this.findWhere(
      'CredentialAssessmentRepository.findByAssessor',
      tenantId,
      {
        application_id: applicationId,
        assessor_employee_id: assessorEmployeeId,
      },
    )
  }

  /**
   * Reads the assessments of a tenant that match identifier conditions. A malformed identifier
   * matches nothing.
   *
   * @param operation - Operation name for errors.
   * @param tenantId - Tenant to search in.
   * @param ids - Identifier fields and the values they must equal.
   * @returns The assessments, oldest first.
   */
  private async findWhere(
    operation: string,
    tenantId: string,
    ids: Record<string, string>,
  ): Promise<CredentialAssessment[]> {
    if (
      !toObjectId(tenantId) ||
      Object.values(ids).some((value) => !toObjectId(value))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(this.toFilter({ tenant_id: tenantId, deleted_at: null, ...ids }))
        .sort({ assessed_at: 1, _id: 1 })
        .lean<LeanRecord<CredentialAssessmentEntity>[]>()
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
   * @returns The assessment.
   */
  protected toModel(
    record: LeanRecord<CredentialAssessmentEntity>,
  ): CredentialAssessment {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      application_id: record.application_id.toHexString(),
      employee_id: record.employee_id.toHexString(),
      assessor_employee_id: record.assessor_employee_id.toHexString(),
      catalog_item_id: record.catalog_item_id.toHexString(),
      methods: record.methods.map((method) => toCoding(method)),
      outcome: record.outcome,
      recommended_condition: record.recommended_condition,
      reason: record.reason,
      assessed_at: record.assessed_at,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
