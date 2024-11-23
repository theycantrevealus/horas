import { ApiProperty } from '@nestjs/swagger'
import { CLOV, ILOV } from '@schemas/lov/lov'
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Types } from 'mongoose'

export class CMasterReceptionistCounter {
  @ApiProperty({
    type: String,
    example: `receptionist_counter-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string
}

export class MasterReceptionistCounterAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Data type',
    required: false,
  })
  @IsOptional()
  @IsArray()
  type: ILOV[]

  @ApiProperty({
    example: 'Extra remark',
    description: 'Extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string
}

export class MasterReceptionistCounterEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Data type',
    required: false,
  })
  @IsOptional()
  @IsArray()
  type: ILOV[]

  @ApiProperty({
    example: 'Extra remark',
    description: 'Extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    example: 0,
    description: 'Item brand document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
