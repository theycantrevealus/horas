import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * Body of `POST /v1/auth/login`.
 *
 * @property tenantId - Tenant to sign in to.
 * @property identifier - Username, email or E.164 phone number.
 * @property password - Plain password.
 */
export class LoginDto {
  @IsMongoId()
  tenantId!: string

  @IsString()
  @MinLength(1)
  @MaxLength(254)
  identifier!: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string
}

/**
 * Body of `POST /v1/auth/refresh`.
 *
 * @property refreshToken - Refresh token from the last login or refresh.
 */
export class RefreshDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken!: string
}

/**
 * Body of `POST /v1/auth/password`.
 *
 * @property currentPassword - The current (or temporary) password.
 * @property newPassword - The new password; the policy is checked by the service.
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  newPassword!: string
}
