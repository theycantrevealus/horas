import { Transform, Type } from 'class-transformer'
import {
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'
import { CodingDto } from '../code-concept/code-concept.dto'

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
 * The issuing authority of a licence.
 *
 * @property name - Name as printed.
 * @property code - The authority as a code, when one exists.
 */
export class IssuingAuthorityDto {
  @IsString()
  @MaxLength(400)
  name!: string

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  code?: CodingDto | null
}

/**
 * Where a licence applies.
 *
 * @property country - ISO 3166-1 alpha-2 code.
 * @property subdivision - ISO 3166-2 code.
 */
export class JurisdictionDto {
  @IsString()
  @MaxLength(8)
  country!: string

  @IsOptional()
  @IsString()
  @MaxLength(16)
  subdivision?: string | null
}

/**
 * The practice location of a licence: a facility of this tenant or another place by name.
 *
 * @property facilityId - Facility of this tenant.
 * @property name - Name of another place.
 */
export class PracticeLocationDto {
  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(400)
  name?: string
}

/**
 * Reference to the scan of a licence. The file itself is not checked.
 *
 * @property fileId - File identifier.
 * @property contentType - MIME type.
 * @property sha256 - SHA-256 hash of the file.
 */
export class DocumentRefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  fileId!: string

  @IsString()
  @MaxLength(100)
  contentType!: string

  @IsString()
  @Matches(/^[0-9a-fA-F]{64}$/)
  sha256!: string
}

/**
 * Fields shared by the HR and the self-service registration of a licence.
 *
 * @property licenseType - Licence type code.
 * @property profession - Profession code.
 * @property specialty - Specialty code.
 * @property documentNumber - Number as printed.
 * @property issuingAuthority - Name, and optional code.
 * @property jurisdiction - Country, and optional subdivision.
 * @property practiceLocation - Required for location-specific types.
 * @property issueDate - Issue date.
 * @property expiryDate - Expiry date; required for types that need one.
 * @property document - Reference to the scan.
 * @property replacesLicenseId - Licence this one renews.
 * @property reason - Why, kept in the change history.
 */
export class OwnLicenseDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  licenseType!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  profession!: CodingDto

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  specialty?: CodingDto | null

  @IsString()
  @MaxLength(200)
  documentNumber!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => IssuingAuthorityDto)
  issuingAuthority!: IssuingAuthorityDto

  @IsDefined()
  @ValidateNested()
  @Type(() => JurisdictionDto)
  jurisdiction!: JurisdictionDto

  @IsOptional()
  @ValidateNested()
  @Type(() => PracticeLocationDto)
  practiceLocation?: PracticeLocationDto | null

  @IsLocalDate()
  issueDate!: string

  @IsOptional()
  @IsLocalDate()
  expiryDate?: string | null

  @IsDefined()
  @ValidateNested()
  @Type(() => DocumentRefDto)
  document!: DocumentRefDto

  @IsOptional()
  @IsMongoId()
  replacesLicenseId?: string | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/licenses`: a licence registered by HR for an employee.
 *
 * @property employeeId - The holder.
 */
export class RegisterLicenseDto extends OwnLicenseDto {
  @IsMongoId()
  employeeId!: string
}

/**
 * Query of `GET /v1/licenses`.
 *
 * @property status - Only licences in this status.
 * @property licenseType - Only this licence type code.
 * @property facilityId - Only licences whose practice location is this facility.
 * @property expiringWithinDays - Only valid licences expiring within this many days.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListLicensesDto {
  @IsOptional()
  @IsIn([
    'pending_verification',
    'valid',
    'rejected',
    'expired',
    'revoked',
    'superseded',
  ])
  status?:
    | 'pending_verification'
    | 'valid'
    | 'rejected'
    | 'expired'
    | 'revoked'
    | 'superseded'

  @IsOptional()
  @IsString()
  @MaxLength(64)
  licenseType?: string

  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  expiringWithinDays?: number

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
