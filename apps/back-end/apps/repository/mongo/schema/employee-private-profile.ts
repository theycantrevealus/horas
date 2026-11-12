import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { AddressEntity, AddressSchema } from './common/address'
import { CodingEntity, CodingSchema } from './common/coding'
import { ContactPointEntity, ContactPointSchema } from './common/contact-point'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'
import { HumanNameEntity, HumanNameSchema } from './common/human-name'

/**
 * Hydrated Mongoose document of an employee private profile.
 */
export type EmployeePrivateProfileDocument =
  HydratedDocument<EmployeePrivateProfileEntity>

/**
 * Mongo storage shape of an official identifier: the plain value is only in `value_encrypted`.
 *
 * @property type - Kind of identifier.
 * @property system - Identifier system.
 * @property issuing_country - ISO 3166-1 alpha-2 code.
 * @property value_encrypted - Encrypted value.
 * @property value_hash - Keyed hash of the normalized value.
 * @property value_masked - Value with all but the last four characters hidden.
 * @property period - Validity of the document, or `null`.
 * @property verified_at - When HR checked the original, or `null`.
 */
@Schema({ _id: false })
export class IdentifierEntity {
  @Prop({ type: CodingSchema, required: true })
  type!: CodingEntity

  @Prop({ type: SchemaTypes.String, required: true })
  system!: string

  @Prop({ type: SchemaTypes.String, required: true })
  issuing_country!: string

  @Prop({ type: SchemaTypes.String, required: true })
  value_encrypted!: string

  @Prop({ type: SchemaTypes.String, required: true })
  value_hash!: string

  @Prop({ type: SchemaTypes.String, required: true })
  value_masked!: string

  @Prop({ type: DatePeriodSchema, default: null })
  period!: DatePeriodEntity | null

  @Prop({ type: SchemaTypes.Date, default: null })
  verified_at!: Date | null
}

/**
 * Mongoose schema of an embedded identifier.
 */
export const IdentifierSchema = SchemaFactory.createForClass(IdentifierEntity)

/**
 * Mongo storage shape of a bank account: the plain number is only in `account_number_encrypted`.
 *
 * @property bank - Bank code.
 * @property account_name - Name on the account.
 * @property account_number_encrypted - Encrypted number or IBAN.
 * @property account_number_masked - Number with all but the last four characters hidden.
 * @property swift_bic - SWIFT/BIC code, or `null`.
 * @property currency - ISO 4217 code.
 * @property is_primary - Account used for salary.
 */
@Schema({ _id: false })
export class BankAccountEntity {
  @Prop({ type: CodingSchema, required: true })
  bank!: CodingEntity

  @Prop({ type: SchemaTypes.String, required: true })
  account_name!: string

  @Prop({ type: SchemaTypes.String, required: true })
  account_number_encrypted!: string

  @Prop({ type: SchemaTypes.String, required: true })
  account_number_masked!: string

  @Prop({ type: SchemaTypes.String, default: null })
  swift_bic!: string | null

  @Prop({ type: SchemaTypes.String, required: true })
  currency!: string

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_primary!: boolean
}

/**
 * Mongoose schema of an embedded bank account.
 */
export const BankAccountSchema = SchemaFactory.createForClass(BankAccountEntity)

/**
 * Mongo storage shape of a family member.
 *
 * @property relationship - Relationship code.
 * @property name - The person's name.
 * @property birth_date - Birth date, or `null`.
 * @property is_dependent - Counted as a dependent.
 */
@Schema({ _id: false })
export class FamilyMemberEntity {
  @Prop({ type: CodingSchema, required: true })
  relationship!: CodingEntity

  @Prop({ type: HumanNameSchema, required: true })
  name!: HumanNameEntity

  @Prop({ type: SchemaTypes.String, default: null })
  birth_date!: string | null

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_dependent!: boolean
}

/**
 * Mongoose schema of an embedded family member.
 */
export const FamilyMemberSchema =
  SchemaFactory.createForClass(FamilyMemberEntity)

/**
 * Mongo storage shape of an emergency contact.
 *
 * @property name - Full name.
 * @property relationship - Relationship code.
 * @property contacts - How to reach them.
 */
@Schema({ _id: false })
export class EmergencyContactEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  name!: string

  @Prop({ type: CodingSchema, required: true })
  relationship!: CodingEntity

  @Prop({ type: [ContactPointSchema], default: [] })
  contacts!: ContactPointEntity[]
}

/**
 * Mongoose schema of an embedded emergency contact.
 */
export const EmergencyContactSchema = SchemaFactory.createForClass(
  EmergencyContactEntity,
)

/**
 * Mongo storage shape of one tax status.
 *
 * @property country - ISO 3166-1 alpha-2 code.
 * @property status - Tax status code.
 * @property effective_date - First day it applies.
 */
@Schema({ _id: false })
export class TaxProfileEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  country!: string

  @Prop({ type: CodingSchema, required: true })
  status!: CodingEntity

  @Prop({ type: SchemaTypes.String, required: true })
  effective_date!: string
}

/**
 * Mongoose schema of an embedded tax status.
 */
export const TaxProfileSchema = SchemaFactory.createForClass(TaxProfileEntity)

/**
 * Mongo storage shape of an `EmployeePrivateProfile`, in the collection
 * `employee_private_profiles`. Only the Mongo repository uses it. The birth date, the identifier
 * values and the bank account numbers are stored encrypted (`account-and-workforce-collections.md`
 * 8.2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee; one profile each.
 * @property birth_date_encrypted - Encrypted birth date, or `null`.
 * @property birth_place - Place of birth, or `null`.
 * @property nationalities - ISO 3166-1 alpha-2 codes.
 * @property identifiers - Official identifiers.
 * @property personal_contacts - Personal phone and email.
 * @property addresses - Home and mailing addresses.
 * @property marital_status - Marital status code, or `null`.
 * @property religion - Religion code, or `null`.
 * @property family_members - Family and dependents.
 * @property emergency_contacts - People to call in an emergency.
 * @property bank_accounts - Salary accounts.
 * @property tax_profile - Tax status history, oldest first.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'employee_private_profiles',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class EmployeePrivateProfileEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, default: null })
  birth_date_encrypted!: string | null

  @Prop({ type: SchemaTypes.String, default: null })
  birth_place!: string | null

  @Prop({ type: [SchemaTypes.String], default: [] })
  nationalities!: string[]

  @Prop({ type: [IdentifierSchema], default: [] })
  identifiers!: IdentifierEntity[]

  @Prop({ type: [ContactPointSchema], default: [] })
  personal_contacts!: ContactPointEntity[]

  @Prop({ type: [AddressSchema], default: [] })
  addresses!: AddressEntity[]

  @Prop({ type: CodingSchema, default: null })
  marital_status!: CodingEntity | null

  @Prop({ type: CodingSchema, default: null })
  religion!: CodingEntity | null

  @Prop({ type: [FamilyMemberSchema], default: [] })
  family_members!: FamilyMemberEntity[]

  @Prop({ type: [EmergencyContactSchema], default: [] })
  emergency_contacts!: EmergencyContactEntity[]

  @Prop({ type: [BankAccountSchema], default: [] })
  bank_accounts!: BankAccountEntity[]

  @Prop({ type: [TaxProfileSchema], default: [] })
  tax_profile!: TaxProfileEntity[]

  @Prop({ type: ActorRefSchema, required: true })
  created_by!: ActorRef

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  created_at?: Date

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  updated_at?: Date

  @Prop({ type: SchemaTypes.Date, default: null })
  deleted_at?: Date | null
}

/**
 * Mongoose schema generated from `EmployeePrivateProfileEntity`.
 */
export const EmployeePrivateProfileSchema = SchemaFactory.createForClass(
  EmployeePrivateProfileEntity,
)

EmployeePrivateProfileSchema.index(
  { tenant_id: 1, employee_id: 1 },
  { unique: true },
)
// An identifier belongs to one employee of the tenant. Partial, so profiles without identifiers do
// not collide.
EmployeePrivateProfileSchema.index(
  {
    tenant_id: 1,
    'identifiers.system': 1,
    'identifiers.value_hash': 1,
  },
  {
    unique: true,
    partialFilterExpression: { 'identifiers.system': { $exists: true } },
  },
)
