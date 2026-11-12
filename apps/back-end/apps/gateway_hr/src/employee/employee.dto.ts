import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'
import { CodingDto } from '../code-concept/code-concept.dto'
import { ExternalIdDto } from '../organization/organization.dto'

/**
 * Employment statuses.
 */
const STATUSES = [
  'onboarding',
  'probation',
  'active',
  'suspended',
  'separated',
] as const

/**
 * Administrative genders of the FHIR value set.
 */
const GENDERS = ['male', 'female', 'other', 'unknown'] as const

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
 * Reads `true` and `false` from a query string; other values stay as they are and fail validation.
 *
 * @param params - Value being transformed.
 * @param params.value - The raw value.
 * @returns A boolean for `true` and `false`, otherwise the value.
 */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true
  }
  return value === 'false' ? false : value
}

/**
 * A person name.
 *
 * @property use - Purpose of the name; only `usual`, `maiden` and `alias` for other names.
 * @property text - Full name as printed.
 * @property family - Family name.
 * @property given - Given names, at most 5.
 * @property prefix - Titles before the name, at most 5.
 * @property suffix - Titles after the name, at most 5.
 * @property script - ISO 15924 script code of a native-script variant.
 */
export class NameDto {
  @IsOptional()
  @IsIn(['official', 'usual', 'maiden', 'alias'])
  use?: 'official' | 'usual' | 'maiden' | 'alias'

  @IsString()
  @MaxLength(400)
  text!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  family?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  given?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  prefix?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  suffix?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(10)
  script?: string
}

/**
 * A specialty of an employee.
 *
 * @property coding - The specialty.
 * @property is_primary - Main specialty; exactly one when the list is not empty.
 */
export class SpecialtyDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  coding!: CodingDto

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean
}

/**
 * A work contact.
 *
 * @property system - Phone or email.
 * @property value - The number (+62...) or address.
 * @property is_primary - Preferred contact of its kind.
 */
export class ContactDto {
  @IsIn(['phone', 'email'])
  system!: 'phone' | 'email'

  @IsString()
  @MaxLength(300)
  value!: string

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean
}

/**
 * Body of `POST /v1/employees`.
 *
 * @property employeeNumber - Hospital-issued number, 1 to 32 characters.
 * @property name - Official name.
 * @property otherNames - Other names, at most 5.
 * @property administrativeGender - FHIR administrative gender.
 * @property workforceCategory - Workforce category code.
 * @property profession - Profession; required for clinical categories.
 * @property specialties - Specialties; clinical employees only, at most 10.
 * @property clinicalLevel - Career level; clinical employees only.
 * @property hireDate - First day of employment, `YYYY-MM-DD`.
 * @property practitionerIds - Public registry numbers, at most 20.
 * @property workContacts - Work email and phone, at most 5.
 * @property preferredLanguage - BCP 47 tag.
 */
export class RegisterEmployeeDto {
  @IsString()
  @MaxLength(64)
  employeeNumber!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => NameDto)
  name!: NameDto

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => NameDto)
  otherNames?: NameDto[]

  @IsOptional()
  @IsIn(GENDERS)
  administrativeGender?: (typeof GENDERS)[number] | null

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  workforceCategory!: CodingDto

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  profession?: CodingDto | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SpecialtyDto)
  specialties?: SpecialtyDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  clinicalLevel?: CodingDto | null

  @IsLocalDate()
  hireDate!: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  practitionerIds?: ExternalIdDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  workContacts?: ContactDto[]

  @IsOptional()
  @IsString()
  @MaxLength(35)
  preferredLanguage?: string | null
}

/**
 * Body of `PATCH /v1/employees/:id`. The number, status, separation date and summaries cannot be
 * changed here; if sent they are dropped by the validation pipe. The category and hire date change
 * only while the employee is onboarding. Send `null` to clear an optional field.
 *
 * @property name - New official name.
 * @property otherNames - New other names, replacing the old ones.
 * @property administrativeGender - New gender, or `null`.
 * @property workforceCategory - New category; onboarding only.
 * @property profession - New profession, or `null`.
 * @property specialties - New specialties, replacing the old ones.
 * @property clinicalLevel - New level, or `null`.
 * @property hireDate - New hire date; onboarding only.
 * @property practitionerIds - New registry numbers, replacing the old ones.
 * @property workContacts - New work contacts, replacing the old ones.
 * @property preferredLanguage - New language, or `null`.
 * @property version - Version the client read.
 * @property reason - Why the data changes, kept in the change history.
 */
export class UpdateEmployeeDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NameDto)
  name?: NameDto

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => NameDto)
  otherNames?: NameDto[]

  @IsOptional()
  @IsIn(GENDERS)
  administrativeGender?: (typeof GENDERS)[number] | null

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  workforceCategory?: CodingDto

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  profession?: CodingDto | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SpecialtyDto)
  specialties?: SpecialtyDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  clinicalLevel?: CodingDto | null

  @IsOptional()
  @IsLocalDate()
  hireDate?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  practitionerIds?: ExternalIdDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  workContacts?: ContactDto[]

  @IsOptional()
  @IsString()
  @MaxLength(35)
  preferredLanguage?: string | null

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
 * Body of `POST /v1/employees/:id/status`.
 *
 * @property status - New employment status.
 * @property effectiveDate - Day the change takes effect; defaults to today in UTC.
 * @property reason - Why; required for `suspended` and `separated`.
 * @property version - Version the client read.
 */
export class ChangeStatusDto {
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number]

  @IsOptional()
  @IsLocalDate()
  effectiveDate?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Query of `GET /v1/employees`.
 *
 * @property name - Part of the display name.
 * @property employeeNumber - Start of the employee number.
 * @property status - Employment status.
 * @property workforceCategory - Code of the workforce category.
 * @property isClinical - Only clinical (`true`) or only non-clinical (`false`) employees.
 * @property unitId - Unit of the primary assignment.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListEmployeesDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  employeeNumber?: string

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number]

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  workforceCategory?: string

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isClinical?: boolean

  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number
}
