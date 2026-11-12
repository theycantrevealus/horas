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
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { EmploymentContract } from '@repository/model/employment-contract'
import { EmploymentContractClassification } from '@repository/model/employment-contract.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { EmploymentContractEntity } from './schema/employment-contract'

/**
 * Mongo implementation of `EmploymentContractRepository`. Contracts are never deleted. The
 * employee, the employer and the contract number cannot change after creation: they are not
 * updatable fields. The terms, the status and the termination are, because drafts are corrected and
 * the lifecycle moves; the service decides when.
 */
@Injectable()
export class EmploymentContractRepositoryMongo
  extends MongoRepositoryBase<EmploymentContract, EmploymentContractEntity>
  implements EmploymentContractRepository
{
  /**
   * @param contractModel - Mongoose model of the `employment_contracts` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(EmploymentContractEntity.name, MONGO_MAIN_CONNECTION)
    contractModel: Model<EmploymentContractEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(contractModel, transactions, changes, {
      name: 'EmploymentContractRepository',
      entityType: 'employment_contract',
      classification: EmploymentContractClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'employment_type',
        'period',
        'probation_end_date',
        'fte',
        'working_time_scheme',
        'previous_contract_id',
        'status',
        'termination',
      ],
    })
  }

  /**
   * Finds a contract by its number inside an employer.
   *
   * @param tenantId - Tenant to search in.
   * @param organizationId - Employer.
   * @param contractNumber - Contract number.
   * @returns The contract, or `null`.
   */
  async findByNumber(
    tenantId: string,
    organizationId: string,
    contractNumber: string,
  ): Promise<EmploymentContract | null> {
    return this.findFirst('findByNumber', [tenantId, organizationId], {
      tenant_id: tenantId,
      organization_id: organizationId,
      contract_number: contractNumber,
    })
  }

  /**
   * Finds every contract of an employee, newest start first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The contracts.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmploymentContract[]> {
    const operation = 'EmploymentContractRepository.findByEmployee'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            deleted_at: null,
          }),
        )
        .sort({ 'period.start': -1, _id: 1 })
        .lean<LeanRecord<EmploymentContractEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the active contract of an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The active contract, or `null`.
   */
  async findActiveByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmploymentContract | null> {
    return this.findFirst('findActiveByEmployee', [tenantId, employeeId], {
      tenant_id: tenantId,
      employee_id: employeeId,
      status: 'active',
    })
  }

  /**
   * Finds the contract that renews another one.
   *
   * @param tenantId - Tenant to search in.
   * @param previousContractId - The contract that is renewed.
   * @returns The renewal, or `null`.
   */
  async findRenewal(
    tenantId: string,
    previousContractId: string,
  ): Promise<EmploymentContract | null> {
    return this.findFirst('findRenewal', [tenantId, previousContractId], {
      tenant_id: tenantId,
      previous_contract_id: previousContractId,
    })
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The contract.
   */
  protected toModel(
    record: LeanRecord<EmploymentContractEntity>,
  ): EmploymentContract {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      organization_id: record.organization_id.toHexString(),
      contract_number: record.contract_number,
      employment_type: toCoding(record.employment_type),
      period: { start: record.period.start, end: record.period.end },
      probation_end_date: record.probation_end_date,
      fte: record.fte,
      working_time_scheme: record.working_time_scheme
        ? toCoding(record.working_time_scheme)
        : null,
      status: record.status,
      previous_contract_id: record.previous_contract_id
        ? record.previous_contract_id.toHexString()
        : null,
      termination: record.termination
        ? {
            date: record.termination.date,
            reason: toCoding(record.termination.reason),
            notes: record.termination.notes,
          }
        : null,
      document: record.document
        ? {
            file_id: record.document.file_id,
            content_type: record.document.content_type,
            sha256: record.document.sha256,
          }
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Runs a named read for the first matching, not soft-deleted contract.
   *
   * @param name - Method name for the operation label.
   * @param ids - Identifiers in the filter; a malformed one gives no result.
   * @param filter - Filter on model fields.
   * @returns The contract, or `null`.
   */
  private async findFirst(
    name: string,
    ids: string[],
    filter: Record<string, unknown>,
  ): Promise<EmploymentContract | null> {
    const operation = `EmploymentContractRepository.${name}`
    if (ids.some((value) => !toObjectId(value))) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ ...filter, deleted_at: null }))
        .lean<LeanRecord<EmploymentContractEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }
}
