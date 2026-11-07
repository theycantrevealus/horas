import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
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
import { IsTimeZone } from '@utility/validation/is-time-zone'

/**
 * Account statuses a list can filter by.
 */
const STATUSES = [
  'pending_activation',
  'active',
  'locked',
  'suspended',
  'disabled',
  'closed',
] as const

/**
 * Pattern of a BCP 47 language tag, for example `id-ID` or `en`.
 */
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

/**
 * Body of `POST /v1/accounts`.
 *
 * @property accountType - `workforce` or `external`.
 * @property username - Login name: 3 to 64 letters, digits, `.`, `_` or `-`.
 * @property email - Optional login email.
 * @property displayName - Name to show.
 * @property givenName - Given name.
 * @property familyName - Family name.
 * @property employeeId - Employee to link; required for `workforce`.
 * @property sponsorAccountId - Sponsor; required for `external`.
 * @property locale - BCP 47 language tag.
 * @property notBefore - First moment of use.
 * @property expiresAt - Last moment of use; required for `external`.
 * @property mfaRequired - Whether a second factor is mandatory.
 * @property reason - Why the account is created.
 */
export class CreateAccountDto {
  @IsIn(['workforce', 'external'])
  accountType!: 'workforce' | 'external'

  @Matches(/^[A-Za-z0-9._-]{3,64}$/, {
    message:
      'username must have 3 to 64 letters, digits, dots, underscores or hyphens',
  })
  username!: string

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  givenName?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  familyName?: string

  @IsOptional()
  @IsMongoId()
  employeeId?: string

  @IsOptional()
  @IsMongoId()
  sponsorAccountId?: string

  @IsOptional()
  @Matches(LOCALE_PATTERN)
  locale?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  notBefore?: Date

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date

  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string
}

/**
 * Query of `GET /v1/accounts`.
 *
 * @property status - Only accounts in this status.
 * @property accountType - Only this kind of account.
 * @property search - Text the username contains.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListAccountsDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number]

  @IsOptional()
  @IsIn(['workforce', 'external', 'service'])
  accountType?: 'workforce' | 'external' | 'service'

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string

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

/**
 * Body of `PATCH /v1/accounts/:id`. Send `null` to clear `timezone`, `notBefore` or `expiresAt`.
 *
 * @property displayName - Name to show (local profiles only).
 * @property givenName - Given name (local profiles only).
 * @property familyName - Family name (local profiles only).
 * @property locale - BCP 47 language tag.
 * @property timezone - IANA time zone, or `null` to use the facility's.
 * @property mfaRequired - Whether a second factor is mandatory.
 * @property notBefore - First moment of use, or `null`.
 * @property expiresAt - Last moment of use, or `null`.
 * @property expectedVersion - Version the administrator read.
 * @property reason - Why, for the change history.
 */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  givenName?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  familyName?: string

  @IsOptional()
  @Matches(LOCALE_PATTERN)
  locale?: string

  @IsOptional()
  @IsTimeZone()
  timezone?: string | null

  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  notBefore?: Date | null

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string
}

/**
 * Body of `POST /v1/accounts/:id/holds`.
 *
 * @property kind - `suspend` (temporary) or `disable`.
 * @property reason - `administrative` or `security`.
 * @property notes - Free-text note.
 * @property expectedVersion - Version the administrator read.
 */
export class PlaceHoldDto {
  @IsIn(['suspend', 'disable'])
  kind!: 'suspend' | 'disable'

  @IsIn(['administrative', 'security'])
  reason!: 'administrative' | 'security'

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number
}

/**
 * Query of `DELETE /v1/accounts/:id/holds`.
 *
 * @property expectedVersion - Version the administrator read.
 */
export class LiftHoldsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedVersion?: number
}

/**
 * Body of `POST /v1/accounts/:id/role-bindings`.
 *
 * @property roleId - Role to grant.
 * @property reason - Why access is granted.
 * @property startsAt - First moment; defaults to now.
 * @property endsAt - Last moment; omitted for open-ended.
 */
export class GrantRoleDto {
  @IsMongoId()
  roleId!: string

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason!: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date
}

/**
 * Body of `POST /v1/accounts/:id/role-bindings/:bindingId/revoke`.
 *
 * @property reason - Why access is withdrawn.
 */
export class RevokeBindingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason!: string
}

/**
 * One localized text in a request.
 *
 * @property locale - BCP 47 language tag.
 * @property text - The text.
 */
export class LocalizedTextDto {
  @Matches(LOCALE_PATTERN)
  locale!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  text!: string
}

/**
 * Body of `POST /v1/roles`.
 *
 * @property code - Unique code: lower-case letters, digits and `_`.
 * @property name - Name per language.
 * @property description - Description per language.
 * @property permissions - Permission codes from the catalog.
 * @property allowedScopes - Levels the role may be granted at.
 * @property assignableBy - Role codes allowed to grant it.
 */
export class CreateRoleDto {
  @Matches(/^[a-z][a-z0-9_]{1,63}$/)
  code!: string

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto[]

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  description!: LocalizedTextDto[]

  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permissions!: string[]

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['tenant', 'organization', 'facility', 'unit'], { each: true })
  allowedScopes!: ('tenant' | 'organization' | 'facility' | 'unit')[]

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  assignableBy!: string[]
}
