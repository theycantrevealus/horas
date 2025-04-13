import { ApiProperty } from '@nestjs/swagger'
import { Ci18nComponent } from '@schemas/i18n/i18n'
import {
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { Ci18nDatetime } from './i18n.datetime'
import { Ci18nNumber } from './i18n.number'

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
    type: Ci18nDatetime,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  datetime: Ci18nDatetime

  @ApiProperty({
    type: Ci18nNumber,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  number: Ci18nNumber

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

  @IsNotEmpty()
  @ValidateNested({ each: true })
  datetime: Ci18nDatetime

  @ApiProperty({
    type: Ci18nNumber,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  number: Ci18nNumber

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
