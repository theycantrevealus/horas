import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  DEFAULT_PAGE_SIZE,
  MONGO_MAIN_CONNECTION,
} from '@utility/database/constant'
import { type Page } from '@utility/database/interface'
import { translateMongoError } from '@utility/database/mongo.error'
import { escapeRegExp, toObjectId, toPage } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import {
  type EmployeePageOptions,
  type EmployeeRepository,
} from '@repository/interface/employee'
import { type Coding } from '@repository/model/common/coding'
import { type ContactPoint } from '@repository/model/common/contact-point'
import { type HumanName } from '@repository/model/common/human-name'
import { Employee } from '@repository/model/employee'
import { EmployeeClassification } from '@repository/model/employee.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { type CodingEntity } from './schema/common/coding'
import { type ContactPointEntity } from './schema/common/contact-point'
import { type HumanNameEntity } from './schema/common/human-name'
import { EmployeeEntity } from './schema/employee'

/**
 * Maps a stored coding to the model, copying only model fields.
 *
 * @param record - Stored coding.
 * @returns The coding.
 */
function toCoding(record: CodingEntity): Coding {
  return {
    system: record.system,
    code: record.code,
    ...(record.display === undefined ? {} : { display: record.display }),
  }
}

/**
 * Maps a stored name to the model, copying only model fields.
 *
 * @param record - Stored name.
 * @returns The name.
 */
function toName(record: HumanNameEntity): HumanName {
  return {
    use: record.use,
    text: record.text,
    ...(record.family === undefined ? {} : { family: record.family }),
    given: [...record.given],
    prefix: [...record.prefix],
    suffix: [...record.suffix],
    ...(record.script === undefined ? {} : { script: record.script }),
  }
}

/**
 * Maps a stored contact to the model, copying only model fields.
 *
 * @param record - Stored contact.
 * @returns The contact.
 */
function toContact(record: ContactPointEntity): ContactPoint {
  return {
    system: record.system,
    value: record.value,
    use: record.use,
    is_primary: record.is_primary,
    verified_at: record.verified_at,
  }
}

/**
 * Mongo implementation of `EmployeeRepository`. Employees are never deleted, only separated. The
 * employee number, the display name and the summaries of the contract and the primary assignment
 * are not updatable here: the number never changes, and the summaries are kept by the contract and
 * assignment groups. The workforce category, `is_clinical`, the hire date and the status fields are
 * updatable because the service corrects them while onboarding and changes the status; the service
 * decides when.
 */
@Injectable()
export class EmployeeRepositoryMongo
  extends MongoRepositoryBase<Employee, EmployeeEntity>
  implements EmployeeRepository
{
  /**
   * @param employeeModel - Mongoose model of the `employees` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(EmployeeEntity.name, MONGO_MAIN_CONNECTION)
    employeeModel: Model<EmployeeEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(employeeModel, transactions, changes, {
      name: 'EmployeeRepository',
      entityType: 'employee',
      classification: EmployeeClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'name',
        'other_names',
        'display_name',
        'administrative_gender',
        'workforce_category',
        'is_clinical',
        'profession',
        'specialties',
        'clinical_level',
        'employment_status',
        'employment_status_since',
        'original_hire_date',
        'separation_date',
        'practitioner_ids',
        'work_contacts',
        'preferred_language',
      ],
    })
  }

  /**
   * Finds an employee by number.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeNumber - Employee number, unique inside the tenant.
   * @returns The employee, or `null` when none matches.
   */
  async findByNumber(
    tenantId: string,
    employeeNumber: string,
  ): Promise<Employee | null> {
    return this.findFirst('findByNumber', tenantId, {
      employee_number: employeeNumber,
    })
  }

  /**
   * Finds the employee that holds a public registry number.
   *
   * @param tenantId - Tenant to search in.
   * @param system - Registry system.
   * @param value - The number.
   * @returns The employee, or `null` when none holds it.
   */
  async findByPractitionerId(
    tenantId: string,
    system: string,
    value: string,
  ): Promise<Employee | null> {
    return this.findFirst('findByPractitionerId', tenantId, {
      practitioner_ids: { $elemMatch: { system, value } },
    })
  }

  /**
   * Returns one page of employees, ordered by employee number.
   *
   * @param tenantId - Tenant to search in.
   * @param options - Filters and paging.
   * @returns The page.
   */
  async findPage(
    tenantId: string,
    options: EmployeePageOptions,
  ): Promise<Page<Employee>> {
    const operation = 'EmployeeRepository.findPage'
    const limit = options.limit ?? DEFAULT_PAGE_SIZE
    const offset = options.offset ?? 0
    if (
      !toObjectId(tenantId) ||
      (options.unitId !== undefined && !toObjectId(options.unitId))
    ) {
      return toPage([], 0, offset, limit)
    }
    const filter = this.toFilter({
      tenant_id: tenantId,
      deleted_at: null,
      ...(options.name === undefined
        ? {}
        : {
            display_name: {
              $regex: escapeRegExp(options.name),
              $options: 'i',
            },
          }),
      ...(options.employeeNumber === undefined
        ? {}
        : {
            employee_number: {
              $regex: `^${escapeRegExp(options.employeeNumber)}`,
            },
          }),
      ...(options.status === undefined
        ? {}
        : { employment_status: options.status }),
      ...(options.workforceCategoryCode === undefined
        ? {}
        : { 'workforce_category.code': options.workforceCategoryCode }),
      ...(options.isClinical === undefined
        ? {}
        : { is_clinical: options.isClinical }),
      ...(options.unitId === undefined
        ? {}
        : { 'primary_assignment.unit_id': options.unitId }),
    })
    try {
      // Sequential on purpose: a transaction session does not allow parallel operations.
      const records = await this.model
        .find(filter)
        .sort({ employee_number: 1, _id: 1 })
        .skip(offset)
        .limit(limit)
        .lean<LeanRecord<EmployeeEntity>[]>()
        .exec()
      const total = await this.model.countDocuments(filter).exec()
      return toPage(
        records.map((record) => this.toModel(record)),
        total,
        offset,
        limit,
      )
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The employee.
   */
  protected toModel(record: LeanRecord<EmployeeEntity>): Employee {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_number: record.employee_number,
      name: toName(record.name),
      other_names: record.other_names.map(toName),
      display_name: record.display_name,
      administrative_gender: record.administrative_gender
        ? toCoding(record.administrative_gender)
        : null,
      workforce_category: toCoding(record.workforce_category),
      is_clinical: record.is_clinical,
      profession: record.profession ? toCoding(record.profession) : null,
      specialties: record.specialties.map(({ coding, is_primary }) => ({
        coding: toCoding(coding),
        is_primary,
      })),
      clinical_level: record.clinical_level
        ? toCoding(record.clinical_level)
        : null,
      employment_status: record.employment_status,
      employment_status_since: record.employment_status_since,
      current_employment: record.current_employment
        ? {
            contract_id: record.current_employment.contract_id.toHexString(),
            organization_id:
              record.current_employment.organization_id.toHexString(),
            employment_type: toCoding(
              record.current_employment.employment_type,
            ),
            start_date: record.current_employment.start_date,
          }
        : null,
      primary_assignment: record.primary_assignment
        ? {
            assignment_id:
              record.primary_assignment.assignment_id.toHexString(),
            facility_id: record.primary_assignment.facility_id.toHexString(),
            unit_id: record.primary_assignment.unit_id.toHexString(),
            position_id: record.primary_assignment.position_id.toHexString(),
          }
        : null,
      original_hire_date: record.original_hire_date,
      separation_date: record.separation_date,
      practitioner_ids: record.practitioner_ids.map(({ system, value }) => ({
        system,
        value,
      })),
      work_contacts: record.work_contacts.map(toContact),
      photo: record.photo
        ? {
            file_id: record.photo.file_id,
            content_type: record.photo.content_type,
            sha256: record.photo.sha256,
          }
        : null,
      preferred_language: record.preferred_language,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Runs a named read for the first matching, not soft-deleted employee.
   *
   * @param name - Method name for the operation label.
   * @param tenantId - Tenant to search in; a malformed one gives no result.
   * @param filter - Filter on model fields.
   * @returns The employee, or `null`.
   */
  private async findFirst(
    name: string,
    tenantId: string,
    filter: Record<string, unknown>,
  ): Promise<Employee | null> {
    const operation = `EmployeeRepository.${name}`
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({ tenant_id: tenantId, ...filter, deleted_at: null }),
        )
        .lean<LeanRecord<EmployeeEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }
}
