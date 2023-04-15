import { Ci18nComponent } from '@core/i18n/schemas/i18n'
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
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_weekday: string

  @ApiProperty({
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_era: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_year: string

  @ApiProperty({
    example: 'long',
    enum: ['2-digit', 'numeric', 'narrow', 'short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_month: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_day: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_hour: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_minute: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_second: string

  @ApiProperty({
    example: 'long',
    enum: ['short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
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

  constructor(parameter: any) {
    this.language_code = parameter.language_code
    this.iso_2_digits = parameter.iso_2_digits
    this.iso_3_digits = parameter.iso_3_digits
    this.name = parameter.name
    this.datetime_weekday = parameter.datetime_weekday
    this.datetime_era = parameter.datetime_era
    this.datetime_year = parameter.datetime_year
    this.datetime_month = parameter.datetime_month
    this.datetime_day = parameter.datetime_day
    this.datetime_hour = parameter.datetime_hour
    this.datetime_minute = parameter.datetime_minute
    this.datetime_second = parameter.datetime_second
    this.datetime_timezone_name = parameter.datetime_timezone_name
    this.components = parameter.components
    this.remark = parameter.remark
  }
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
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_weekday: string

  @ApiProperty({
    example: 'long',
    enum: ['narrow', 'short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_era: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_year: string

  @ApiProperty({
    example: 'long',
    enum: ['2-digit', 'numeric', 'narrow', 'short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_month: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_day: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_hour: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_minute: string

  @ApiProperty({
    example: 'numeric',
    enum: ['2-digit', 'numeric'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  datetime_second: string

  @ApiProperty({
    example: 'long',
    enum: ['short', 'long'],
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
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

  constructor(parameter: any) {
    this.language_code = parameter.language_code
    this.iso_2_digits = parameter.iso_2_digits
    this.iso_3_digits = parameter.iso_3_digits
    this.name = parameter.name
    this.datetime_weekday = parameter.datetime_weekday
    this.datetime_era = parameter.datetime_era
    this.datetime_year = parameter.datetime_year
    this.datetime_month = parameter.datetime_month
    this.datetime_day = parameter.datetime_day
    this.datetime_hour = parameter.datetime_hour
    this.datetime_minute = parameter.datetime_minute
    this.datetime_second = parameter.datetime_second
    this.datetime_timezone_name = parameter.datetime_timezone_name
    this.components = parameter.components
    this.remark = parameter.remark
    this.__v = parameter.__v
  }
}
