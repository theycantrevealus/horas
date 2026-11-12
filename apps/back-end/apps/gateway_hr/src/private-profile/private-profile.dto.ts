import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'
import { CodingDto, DatePeriodDto } from '../code-concept/code-concept.dto'
import { NameDto } from '../employee/employee.dto'
import { AddressDto } from '../facility/facility.dto'

/**
 * Trims a string value before validation; other values pass through unchanged.
 *
 * @param params - Value being transformed.
 * @param params.value - The raw value.
 * @returns The trimmed string, or the value unchanged.
 */
function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value
}

/**
 * A personal or emergency contact.
 *
 * @property system - Phone or email.
 * @property value - The number (+62...) or address.
 * @property use - Home, mobile or work.
 * @property is_primary - Preferred contact of its kind.
 */
export class PersonalContactDto {
  @IsIn(['phone', 'email'])
  system!: 'phone' | 'email'

  @IsString()
  @MaxLength(300)
  value!: string

  @IsOptional()
  @IsIn(['home', 'mobile', 'work'])
  use?: 'home' | 'mobile' | 'work'

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean
}

/**
 * A family member.
 *
 * @property relationship - Relationship code.
 * @property name - The person's name.
 * @property birthDate - Birth date, when known.
 * @property isDependent - Counted as a dependent.
 */
export class FamilyMemberDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  relationship!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => NameDto)
  name!: NameDto

  @IsOptional()
  @IsLocalDate()
  birthDate?: string | null

  @IsOptional()
  @IsBoolean()
  isDependent?: boolean
}

/**
 * An emergency contact.
 *
 * @property name - Full name.
 * @property relationship - Relationship code.
 * @property contacts - How to reach them, 1 to 5.
 */
export class EmergencyContactDto {
  @IsString()
  @MaxLength(400)
  name!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  relationship!: CodingDto

  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PersonalContactDto)
  contacts!: PersonalContactDto[]
}

/**
 * One tax status.
 *
 * @property country - ISO 3166-1 alpha-2 code.
 * @property status - Tax status code.
 * @property effectiveDate - First day it applies.
 */
export class TaxProfileDto {
  @Matches(/^[A-Z]{2}$/, { message: 'country must be two capital letters' })
  country!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  status!: CodingDto

  @IsLocalDate()
  effectiveDate!: string
}

/**
 * Body of `PUT /v1/employees/:id/private-profile`. The profile fields are replaced as a whole: a
 * field that is left out is cleared. Identifiers and bank accounts are not part of it.
 *
 * @property birthDate - Birth date, `YYYY-MM-DD`.
 * @property birthPlace - Place of birth.
 * @property nationalities - ISO 3166-1 alpha-2 codes, at most 5.
 * @property personalContacts - Personal phone and email, at most 10.
 * @property addresses - Addresses, at most 5.
 * @property maritalStatus - Marital status code.
 * @property religion - Religion code.
 * @property familyMembers - Family members, at most 20.
 * @property emergencyContacts - Emergency contacts, at most 5.
 * @property taxProfile - Tax status history, at most 20.
 * @property version - Version the client read.
 * @property reason - Why the data changes, kept in the change history.
 */
export class SaveProfileDto {
  @IsOptional()
  @IsLocalDate()
  birthDate?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(300)
  birthPlace?: string | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(2, { each: true })
  nationalities?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PersonalContactDto)
  personalContacts?: PersonalContactDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  maritalStatus?: CodingDto | null

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  religion?: CodingDto | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FamilyMemberDto)
  familyMembers?: FamilyMemberDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TaxProfileDto)
  taxProfile?: TaxProfileDto[]

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * One identifier as written by a client.
 *
 * @property type - Kind of identifier, an `identifier-type` code.
 * @property system - Identifier system, for example `id.nik`.
 * @property issuingCountry - ISO 3166-1 alpha-2 code.
 * @property value - Value as printed on the document.
 * @property period - Validity of the document.
 */
export class IdentifierDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  type!: CodingDto

  @IsString()
  @MaxLength(64)
  system!: string

  @Matches(/^[A-Z]{2}$/, {
    message: 'issuingCountry must be two capital letters',
  })
  issuingCountry!: string

  @IsString()
  @MaxLength(100)
  value!: string

  @IsOptional()
  @ValidateNested()
  @Type(() => DatePeriodDto)
  period?: DatePeriodDto | null
}

/**
 * Body of `PUT /v1/employees/:id/private-profile/identifiers`.
 *
 * @property identifiers - The new list, at most 10, one per system.
 * @property version - Version the client read.
 * @property reason - Why the data changes.
 */
export class ReplaceIdentifiersDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => IdentifierDto)
  identifiers!: IdentifierDto[]

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * One bank account as written by a client.
 *
 * @property bank - Bank code.
 * @property accountName - Name on the account.
 * @property accountNumber - Account number or IBAN.
 * @property swiftBic - SWIFT/BIC code.
 * @property currency - ISO 4217 code.
 * @property isPrimary - Account used for salary.
 */
export class BankAccountDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  bank!: CodingDto

  @IsString()
  @MaxLength(400)
  accountName!: string

  @IsString()
  @MaxLength(100)
  accountNumber!: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftBic?: string | null

  @Matches(/^[A-Z]{3}$/, { message: 'currency must be three capital letters' })
  currency!: string

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}

/**
 * Body of `PUT /v1/employees/:id/private-profile/bank-accounts`.
 *
 * @property bankAccounts - The new list, at most 5, exactly one primary.
 * @property version - Version the client read.
 * @property reason - Why the data changes.
 */
export class ReplaceBankAccountsDto {
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts!: BankAccountDto[]

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}
