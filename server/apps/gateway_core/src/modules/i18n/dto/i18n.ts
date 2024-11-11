import { Ci18nComponent } from '@gateway_core/i18n/schemas/i18n'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

export class i18nAddDTO {
  @ApiProperty({
    example: 'xx',
    minLength: 2,
    maxLength: 2,
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  language_code: string

  @ApiProperty({
    example: 'xx',
    minLength: 2,
    maxLength: 2,
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  iso_2_digits: string

  @ApiProperty({
    example: 'xxx',
    minLength: 3,
    maxLength: 3,
    description: '',
  })
  @MinLength(3)
  @MaxLength(3)
  @IsNotEmpty()
  iso_3_digits: string

  @ApiProperty({
    example: 'Main Storage',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: '',
    description: '',
  })
  @IsNotEmpty()
  currency: string

  @ApiProperty({
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_weekday: string

  @ApiProperty({
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_era: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_year: string

  @ApiProperty({
    example: 'long',
    enum: ['2-digit', 'numeric', 'narrow', 'short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_month: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_day: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_hour: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_minute: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_second: string

  @ApiProperty({
    example: 'long',
    enum: ['short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_timezone_name: string

  @ApiProperty({
    type: Ci18nComponent,
    isArray: true,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  components: Ci18nComponent[]

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
  })
  @IsNotEmpty()
  remark: string
}

export class i18nEditDTO {
  @ApiProperty({
    example: 'xx',
    minLength: 2,
    maxLength: 2,
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  language_code: string

  @ApiProperty({
    example: 'xx',
    minLength: 2,
    maxLength: 2,
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  iso_2_digits: string

  @ApiProperty({
    example: 'xxx',
    minLength: 3,
    maxLength: 3,
    description: '',
  })
  @MinLength(3)
  @MaxLength(3)
  @IsNotEmpty()
  iso_3_digits: string

  @ApiProperty({
    example: 'Main Storage',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: '',
    description: '',
  })
  @IsNotEmpty()
  currency: string

  @ApiProperty({
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_weekday: string

  @ApiProperty({
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_era: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_year: string

  @ApiProperty({
    example: 'long',
    enum: ['2-digit', 'numeric', 'narrow', 'short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_month: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_day: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_hour: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_minute: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @IsNotEmpty()
  datetime_second: string

  @ApiProperty({
    example: 'long',
    enum: ['short', 'long'],
    description: '',
  })
  @IsNotEmpty()
  datetime_timezone_name: string

  @ApiProperty({
    type: Ci18nComponent,
    isArray: true,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  components: Ci18nComponent[]

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
  })
  @IsNotEmpty()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Item brand document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
