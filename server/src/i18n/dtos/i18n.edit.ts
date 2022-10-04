import { Corei18nComponentModel } from '@/models/core.i18n.compontent.model'
import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator'

export class Corei18nDTOEdit {
  @ApiProperty({
    example: 'Indonesia',
    type: String,
    description: 'Language name',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'ID',
    type: String,
    description: 'ISO 2 digits language code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2)
  @Transform((e) => e.value.toUpperCase())
  iso_2_digits: string

  @ApiProperty({
    example: 'IDN',
    type: String,
    description: 'ISO 3 digits language code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3)
  @Transform((e) => e.value.toUpperCase())
  iso_3_digits: string

  @ApiProperty({
    example: 'short',
    enum: ['narrow', 'short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  datetime_weekday: string

  @ApiProperty({
    example: 'short',
    enum: ['narrow', 'short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  datetime_era: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @IsNotEmpty()
  @IsString()
  datetime_year: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit', 'narrow', 'short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @IsString()
  @IsNotEmpty()
  datetime_month: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @IsNotEmpty()
  @IsString()
  datetime_day: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @IsNotEmpty()
  @IsString()
  datetime_hour: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @IsNotEmpty()
  @IsString()
  datetime_minute: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @IsNotEmpty()
  @IsString()
  datetime_second: string

  @ApiProperty({
    example: 'short',
    enum: ['short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @IsNotEmpty()
  @IsString()
  datetime_timezone_name: string

  @ApiProperty({
    type: Corei18nComponentModel,
    isArray: true,
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Corei18nComponentModel)
  components: Corei18nComponentModel[]
}
