import { Transform, Type } from 'class-transformer'
import {
  IsDefined,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'
import { CodingDto, DatePeriodDto } from '../code-concept/code-concept.dto'

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
 * Path parameter that names an employee.
 *
 * @property id - Employee identifier.
 */
export class EmployeeIdParamDto {
  @IsMongoId()
  id!: string
}

/**
 * Body of `POST /v1/contracts`.
 *
 * @property employeeId - The employee.
 * @property organizationId - Employer.
 * @property contractNumber - Number, unique per employer; upper-cased by the service.
 * @property employmentType - Employment type code.
 * @property period - Contract dates; `end` is required for fixed-term types.
 * @property probationEndDate - Last day of probation, for types that allow it.
 * @property fte - Full-time equivalent, above 0 and at most 1; default 1.
 * @property workingTimeScheme - Working-time scheme code.
 * @property previousContractId - Contract this one renews.
 */
export class CreateContractDto {
  @IsMongoId()
  employeeId!: string

  @IsMongoId()
  organizationId!: string

  @IsString()
  @MaxLength(64)
  contractNumber!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  employmentType!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => DatePeriodDto)
  period!: DatePeriodDto

  @IsOptional()
  @IsLocalDate()
  probationEndDate?: string | null

  @IsOptional()
  @IsNumber()
  fte?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  workingTimeScheme?: CodingDto | null

  @IsOptional()
  @IsMongoId()
  previousContractId?: string | null
}

/**
 * Body of `PATCH /v1/contracts/:id`, for drafts only. The employee, employer and number cannot be
 * changed; if sent they are dropped by the validation pipe. Send `null` to clear an optional field.
 *
 * @property employmentType - New employment type.
 * @property period - New dates.
 * @property probationEndDate - New probation end, or `null`.
 * @property fte - New full-time equivalent.
 * @property workingTimeScheme - New scheme, or `null`.
 * @property previousContractId - New renewal link, or `null`.
 * @property version - Version the client read.
 * @property reason - Why the data changes, kept in the change history.
 */
export class UpdateContractDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  employmentType?: CodingDto

  @IsOptional()
  @ValidateNested()
  @Type(() => DatePeriodDto)
  period?: DatePeriodDto

  @IsOptional()
  @IsLocalDate()
  probationEndDate?: string | null

  @IsOptional()
  @IsNumber()
  fte?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  workingTimeScheme?: CodingDto | null

  @IsOptional()
  @IsMongoId()
  previousContractId?: string | null

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
 * Body of `POST /v1/contracts/:id/activate` and `POST /v1/contracts/:id/end`.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class LifecycleDto {
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
 * Body of `POST /v1/contracts/:id/terminate`.
 *
 * @property date - Last day of the contract, `YYYY-MM-DD`.
 * @property reason - Termination reason code.
 * @property notes - Free text, up to 500 characters.
 * @property version - Version the client read.
 */
export class TerminateContractDto {
  @IsLocalDate()
  date!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  reason!: CodingDto

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}
