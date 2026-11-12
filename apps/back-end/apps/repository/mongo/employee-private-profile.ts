import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import {
  RepositoryConflictError,
  RepositoryError,
  RepositoryValidationError,
} from '@utility/database/error'
import { type UpdateOptions } from '@utility/database/interface'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import {
  FIELD_CIPHER,
  type FieldCipher,
  FieldCipherError,
  mask,
} from '@utility/encryption/field-cipher'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import {
  type EmployeePrivateProfileRepository,
  type ProfileFields,
  type RevealedIdentifier,
} from '@repository/interface/employee-private-profile'
import { type BankAccountInput } from '@repository/model/common/bank-account'
import { type PersonIdentifierInput } from '@repository/model/common/person-identifier'
import { EmployeePrivateProfile } from '@repository/model/employee-private-profile'
import { EmployeePrivateProfileClassification } from '@repository/model/employee-private-profile.classification'
import { LeanRecord, MongoRepositoryBase, CURRENT_SCHEMA_VERSION } from './base'
import { toContact, toCoding, toName } from './employee'
import { toAddress } from './facility'
import { type CodingEntity } from './schema/common/coding'
import { type ContactPointEntity } from './schema/common/contact-point'
import { EmployeePrivateProfileEntity } from './schema/employee-private-profile'

/**
 * Names of the encrypted fields, bound into each ciphertext (`FieldCipher.encrypt`).
 */
const FIELD = {
  birthDate: 'birth_date',
  identifier: 'identifier_value',
  bankAccount: 'bank_account_number',
} as const

/**
 * Fields a new profile starts with, so a first write of identifiers or bank accounts creates a
 * complete document.
 */
const EMPTY_PROFILE = {
  birth_date_encrypted: null,
  birth_place: null,
  nationalities: [],
  identifiers: [],
  personal_contacts: [],
  addresses: [],
  marital_status: null,
  religion: null,
  family_members: [],
  emergency_contacts: [],
  bank_accounts: [],
  tax_profile: [],
}

/**
 * Mongo implementation of `EmployeePrivateProfileRepository`. The birth date, identifier values and
 * bank account numbers are encrypted here, identifiers are also hashed, and reads return identifiers
 * and bank accounts masked. The plain values appear nowhere else: not in the model, the change
 * history or an error message. The generic `create`, `update`, `delete` and `deleteSoft` are not
 * supported; `saveProfile`, `replaceIdentifiers` and `replaceBankAccounts` replace them.
 */
@Injectable()
export class EmployeePrivateProfileRepositoryMongo
  extends MongoRepositoryBase<
    EmployeePrivateProfile,
    EmployeePrivateProfileEntity
  >
  implements EmployeePrivateProfileRepository
{
  /**
   * @param profileModel - Mongoose model of the `employee_private_profiles` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   * @param cipher - Encrypts, decrypts and hashes the secret fields.
   */
  constructor(
    @InjectModel(EmployeePrivateProfileEntity.name, MONGO_MAIN_CONNECTION)
    profileModel: Model<EmployeePrivateProfileEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
    @Inject(FIELD_CIPHER) private readonly cipher: FieldCipher,
  ) {
    super(profileModel, transactions, changes, {
      name: 'EmployeePrivateProfileRepository',
      entityType: 'employee_private_profile',
      classification: EmployeePrivateProfileClassification,
      allowUpdate: false,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [],
    })
  }

  /**
   * Refuses the generic create: a profile is created by the first `saveProfile`,
   * `replaceIdentifiers` or `replaceBankAccounts`, which encrypt the secret fields.
   *
   * @throws RepositoryValidationError always.
   */
  override create(): Promise<EmployeePrivateProfile> {
    const operation = 'EmployeePrivateProfileRepository.create'
    return Promise.reject(
      new RepositoryValidationError(
        `${operation}: create is not supported on employee_private_profile`,
        { operation },
      ),
    )
  }

  /**
   * Finds the profile of an employee, masked, with the birth date decrypted.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee the profile belongs to.
   * @returns The profile, or `null` when the employee has none.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmployeePrivateProfile | null> {
    const operation = 'EmployeePrivateProfileRepository.findByEmployee'
    const record = await this.readOne(operation, tenantId, {
      employee_id: employeeId,
    })
    return record ? this.decryptModel(record, operation) : null
  }

  /**
   * Finds one identifier of an employee in full.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee the profile belongs to.
   * @param system - Identifier system.
   * @returns The plain value and its profile, or `null`.
   */
  async findIdentifierValue(
    tenantId: string,
    employeeId: string,
    system: string,
  ): Promise<RevealedIdentifier | null> {
    const operation = 'EmployeePrivateProfileRepository.findIdentifierValue'
    const record = await this.readOne(operation, tenantId, {
      employee_id: employeeId,
    })
    const identifier = record?.identifiers.find(
      (item) => item.system === system,
    )
    if (!record || !identifier) {
      return null
    }
    return {
      profile_id: record._id.toHexString(),
      value: this.decrypt(
        record.tenant_id.toHexString(),
        FIELD.identifier,
        identifier.value_encrypted,
        operation,
      ),
    }
  }

  /**
   * Finds the employee that holds an identifier, by its hash.
   *
   * @param tenantId - Tenant to search in.
   * @param system - Identifier system.
   * @param value - Normalized plain value.
   * @returns The identifier of the employee, or `null`.
   */
  async findEmployeeIdByIdentifier(
    tenantId: string,
    system: string,
    value: string,
  ): Promise<string | null> {
    const record = await this.readOne(
      'EmployeePrivateProfileRepository.findEmployeeIdByIdentifier',
      tenantId,
      {
        identifiers: {
          $elemMatch: {
            system,
            value_hash: this.cipher.hash(tenantId, value),
          },
        },
      },
    )
    return record ? record.employee_id.toHexString() : null
  }

  /**
   * Replaces the profile fields and records the change.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param fields - The new fields.
   * @param options - Optional concurrency check.
   * @returns The profile after the write.
   */
  saveProfile(
    tenantId: string,
    employeeId: string,
    fields: ProfileFields,
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile> {
    return this.write(
      'EmployeePrivateProfileRepository.saveProfile',
      tenantId,
      employeeId,
      {
        birth_date_encrypted:
          fields.birth_date === null
            ? null
            : this.cipher.encrypt(tenantId, FIELD.birthDate, fields.birth_date),
        birth_place: fields.birth_place,
        nationalities: fields.nationalities,
        personal_contacts: fields.personal_contacts,
        addresses: fields.addresses,
        marital_status: fields.marital_status,
        religion: fields.religion,
        family_members: fields.family_members,
        emergency_contacts: fields.emergency_contacts,
        tax_profile: fields.tax_profile,
      },
      options,
    )
  }

  /**
   * Replaces the identifiers: encrypts, hashes and masks each value.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param identifiers - The new identifiers, with normalized plain values.
   * @param options - Optional concurrency check.
   * @returns The profile after the write.
   */
  replaceIdentifiers(
    tenantId: string,
    employeeId: string,
    identifiers: PersonIdentifierInput[],
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile> {
    return this.write(
      'EmployeePrivateProfileRepository.replaceIdentifiers',
      tenantId,
      employeeId,
      {
        identifiers: identifiers.map((item) => ({
          type: item.type,
          system: item.system,
          issuing_country: item.issuing_country,
          value_encrypted: this.cipher.encrypt(
            tenantId,
            FIELD.identifier,
            item.value,
          ),
          value_hash: this.cipher.hash(tenantId, item.value),
          value_masked: mask(item.value),
          period: item.period,
          verified_at: null,
        })),
      },
      options,
    )
  }

  /**
   * Replaces the bank accounts: encrypts and masks each number.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param accounts - The new accounts, with normalized plain numbers.
   * @param options - Optional concurrency check.
   * @returns The profile after the write.
   */
  replaceBankAccounts(
    tenantId: string,
    employeeId: string,
    accounts: BankAccountInput[],
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile> {
    return this.write(
      'EmployeePrivateProfileRepository.replaceBankAccounts',
      tenantId,
      employeeId,
      {
        bank_accounts: accounts.map((item) => ({
          bank: item.bank,
          account_name: item.account_name,
          account_number_encrypted: this.cipher.encrypt(
            tenantId,
            FIELD.bankAccount,
            item.account_number,
          ),
          account_number_masked: mask(item.account_number),
          swift_bic: item.swift_bic,
          currency: item.currency,
          is_primary: item.is_primary,
        })),
      },
      options,
    )
  }

  /**
   * Maps a stored record to the model without decrypting anything: the birth date is `null`. The
   * shared base uses it for the record of a write; the repository's own methods use
   * `decryptModel`, which fills the birth date.
   *
   * @param record - Stored record.
   * @returns The profile with identifiers and bank accounts masked.
   */
  protected toModel(
    record: LeanRecord<EmployeePrivateProfileEntity>,
  ): EmployeePrivateProfile {
    return this.mapRecord(record, null)
  }

  /**
   * Maps a stored record to the model and decrypts the birth date.
   *
   * @param record - Stored record.
   * @param operation - Operation name for the error.
   * @returns The profile.
   * @throws RepositoryError when the birth date cannot be decrypted.
   */
  private decryptModel(
    record: LeanRecord<EmployeePrivateProfileEntity>,
    operation: string,
  ): EmployeePrivateProfile {
    return this.mapRecord(
      record,
      record.birth_date_encrypted === null
        ? null
        : this.decrypt(
            record.tenant_id.toHexString(),
            FIELD.birthDate,
            record.birth_date_encrypted,
            operation,
          ),
    )
  }

  /**
   * Copies the model fields of a record.
   *
   * @param record - Stored record.
   * @param birthDate - Decrypted birth date, or `null`.
   * @returns The profile.
   */
  private mapRecord(
    record: LeanRecord<EmployeePrivateProfileEntity>,
    birthDate: string | null,
  ): EmployeePrivateProfile {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      birth_date: birthDate,
      birth_place: record.birth_place,
      nationalities: [...record.nationalities],
      identifiers: record.identifiers.map((item) => ({
        type: toCoding(item.type),
        system: item.system,
        issuing_country: item.issuing_country,
        value_masked: item.value_masked,
        value_hash: item.value_hash,
        period: item.period
          ? { start: item.period.start, end: item.period.end }
          : null,
        verified_at: item.verified_at,
      })),
      personal_contacts: record.personal_contacts.map(toContact),
      addresses: record.addresses.map((item) => {
        const address = toAddress(item)
        return address as NonNullable<typeof address>
      }),
      marital_status: record.marital_status
        ? toCoding(record.marital_status)
        : null,
      religion: record.religion ? toCoding(record.religion) : null,
      family_members: record.family_members.map((member) => ({
        relationship: toCoding(member.relationship),
        name: toName(member.name),
        birth_date: member.birth_date,
        is_dependent: member.is_dependent,
      })),
      emergency_contacts: record.emergency_contacts.map((contact) => ({
        name: contact.name,
        relationship: toCoding(contact.relationship),
        contacts: contact.contacts.map((item: ContactPointEntity) =>
          toContact(item),
        ),
      })),
      bank_accounts: record.bank_accounts.map((account) => ({
        bank: toCoding(account.bank as CodingEntity),
        account_name: account.account_name,
        account_number_masked: account.account_number_masked,
        swift_bic: account.swift_bic,
        currency: account.currency,
        is_primary: account.is_primary,
      })),
      tax_profile: record.tax_profile.map((entry) => ({
        country: entry.country,
        status: toCoding(entry.status),
        effective_date: entry.effective_date,
      })),
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Runs a named read for the first matching, not soft-deleted profile.
   *
   * @param operation - Operation name for errors.
   * @param tenantId - Tenant to search in; a malformed one gives no result.
   * @param filter - Filter on stored fields; an `employee_id` must be well formed.
   * @returns The stored record, or `null`.
   */
  private async readOne(
    operation: string,
    tenantId: string,
    filter: Record<string, unknown>,
  ): Promise<LeanRecord<EmployeePrivateProfileEntity> | null> {
    const employeeId = filter.employee_id
    if (
      !toObjectId(tenantId) ||
      (typeof employeeId === 'string' && !toObjectId(employeeId))
    ) {
      return null
    }
    try {
      return await this.model
        .findOne(
          this.toFilter({ tenant_id: tenantId, ...filter, deleted_at: null }),
        )
        .lean<LeanRecord<EmployeePrivateProfileEntity>>()
        .exec()
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Creates the profile of an employee or changes some of its fields, in one transaction with the
   * change record. The change record is built from models that hold masked identifiers and bank
   * accounts, and the diff reduces the birth date to `changed`, so no plain secret reaches it.
   *
   * @param operation - Operation name for errors and the change record.
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param changes - Stored fields to set.
   * @param options - Optional concurrency check.
   * @returns The profile after the write.
   * @throws RepositoryConflictError when the stored version differs, the profile was created at the
   * same time by another request, or another employee holds an identifier.
   */
  private async write(
    operation: string,
    tenantId: string,
    employeeId: string,
    changes: Record<string, unknown>,
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile> {
    const actor = this.requireActor(operation)
    const tenantObjectId = this.requireObjectId(tenantId, operation)
    const employeeObjectId = this.requireObjectId(employeeId, operation)
    const expected = options?.expectedVersion
    try {
      return await this.transactions.run(async () => {
        const before = await this.model
          .findOne(
            this.toFilter({
              tenant_id: tenantObjectId,
              employee_id: employeeObjectId,
              deleted_at: null,
            }),
          )
          .lean<LeanRecord<EmployeePrivateProfileEntity>>()
          .exec()
        if (!before) {
          if (expected !== undefined) {
            throw this.changed(operation)
          }
          const [document] = await this.model.create([
            this.asDocument({
              ...EMPTY_PROFILE,
              ...changes,
              tenant_id: tenantObjectId,
              employee_id: employeeObjectId,
              schema_version: CURRENT_SCHEMA_VERSION,
              created_by: actor,
            }),
          ])
          const created = this.decryptModel(
            document.toObject<LeanRecord<EmployeePrivateProfileEntity>>(),
            operation,
          )
          await this.record(null, created, operation)
          return created
        }
        if (expected !== undefined && before.version !== expected) {
          throw this.changed(operation)
        }
        const record = await this.model
          .findOneAndUpdate(
            this.toFilter({
              _id: before._id,
              deleted_at: null,
              ...(expected === undefined ? {} : { version: expected }),
            }),
            {
              $set: { ...changes, updated_at: new Date() },
              $inc: { version: 1 },
            },
            { returnDocument: 'after', runValidators: true },
          )
          .lean<LeanRecord<EmployeePrivateProfileEntity>>()
          .exec()
        if (!record) {
          throw this.changed(operation)
        }
        const after = this.decryptModel(record, operation)
        await this.record(
          this.decryptModel(before, operation),
          after,
          operation,
        )
        return after
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Decrypts one stored value, turning a cipher failure into a repository error without the value.
   *
   * @param tenantId - Tenant that owns the value.
   * @param field - Name of the field.
   * @param ciphertext - Stored value.
   * @param operation - Operation name for the error.
   * @returns The plain value.
   * @throws RepositoryError when the value cannot be decrypted.
   */
  private decrypt(
    tenantId: string,
    field: string,
    ciphertext: string,
    operation: string,
  ): string {
    try {
      return this.cipher.decrypt(tenantId, field, ciphertext)
    } catch (error: unknown) {
      if (error instanceof FieldCipherError) {
        throw new RepositoryError(
          `${operation}: a stored value could not be decrypted`,
          { operation, cause: error },
        )
      }
      throw error
    }
  }

  /**
   * Builds the error for a stale version or a concurrent first write. It holds no values.
   *
   * @param operation - Operation name.
   * @returns The error to throw.
   */
  private changed(operation: string): RepositoryConflictError {
    return new RepositoryConflictError(
      `${operation}: the profile was changed by someone else`,
      { operation },
    )
  }
}
