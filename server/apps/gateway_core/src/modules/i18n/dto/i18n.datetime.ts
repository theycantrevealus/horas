import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, ValidateNested } from 'class-validator'

export class Ci18nDatetimeProperty {
  @ApiProperty({
    example: 'short',
    description: '',
    enum: ['short', 'long', 'narrow'],
  })
  @IsNotEmpty()
  weekday: string

  @ApiProperty({
    example: 'short',
    description: '',
    enum: ['short', 'long', 'narrow'],
  })
  @IsNotEmpty()
  era: string

  @ApiProperty({
    example: 'numeric',
    description: '',
    enum: ['2-digit', 'numeric'],
  })
  @IsNotEmpty()
  year: string

  @ApiProperty({
    example: 'numeric',
    description: '',
    enum: ['2-digit', 'numeric', 'narrow', 'short', 'long'],
  })
  @IsNotEmpty()
  month: string

  @ApiProperty({
    example: 'numeric',
    description: '',
    enum: ['2-digit', 'numeric'],
  })
  @IsNotEmpty()
  day: string

  @ApiProperty({
    example: 'numeric',
    description: '',
    enum: ['2-digit', 'numeric'],
  })
  @IsNotEmpty()
  hour: string

  @ApiProperty({
    example: 'numeric',
    description: '',
    enum: ['2-digit', 'numeric'],
  })
  @IsNotEmpty()
  minute: string

  @ApiProperty({
    example: 'numeric',
    description: '',
    enum: ['2-digit', 'numeric'],
  })
  @IsNotEmpty()
  second: string

  @ApiProperty({
    example: 'short',
    description: '',
    enum: ['short', 'long'],
  })
  @IsNotEmpty()
  timezone_name: string
}

export class Ci18nDatetime {
  @ApiProperty({
    type: Ci18nDatetimeProperty,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  short: Ci18nDatetimeProperty

  @ApiProperty({
    type: Ci18nDatetimeProperty,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  long: Ci18nDatetimeProperty
}
