import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

/**
 * Body of `POST /v1/lov`.
 *
 * @property group_name - Group the value belongs to.
 * @property set_value - Stored value; unique.
 * @property description - Human-readable description.
 * @property additional - Free-form extra data.
 * @property reason - Why the value is added, for the change history.
 */
export class CreateLovDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  group_name!: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  set_value!: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string

  @IsOptional()
  @IsObject()
  additional?: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string
}

/**
 * Body of `PATCH /v1/lov/:id`.
 *
 * @property group_name - Group the value belongs to.
 * @property set_value - Stored value; unique.
 * @property description - Human-readable description.
 * @property additional - Free-form extra data.
 * @property reason - Why the value changes, for the change history.
 */
export class UpdateLovDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  group_name?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  set_value?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string

  @IsOptional()
  @IsObject()
  additional?: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string
}
