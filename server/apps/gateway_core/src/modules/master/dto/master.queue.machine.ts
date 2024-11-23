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

export class CMasterQueueMachine {
  @ApiProperty({
    type: String,
    example: `queue_machine-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string
}

export class MasterQueueMachineAddDTO {
  @ApiProperty({
    example: 'xxx',
    minLength: 3,
    maxLength: 3,
    description: 'Unique code for queue (3 digits)',
  })
  @MinLength(3)
  @MaxLength(3)
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
    description: '',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string
}

export class MasterQueueMachineEditDTO {
  @ApiProperty({
    example: 'xxx',
    minLength: 3,
    maxLength: 3,
    description: 'Unique code for queue (3 digits)',
  })
  @MinLength(3)
  @MaxLength(3)
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
    description: '',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
