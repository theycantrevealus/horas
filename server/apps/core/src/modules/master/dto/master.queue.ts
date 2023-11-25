import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Types } from 'mongoose'

export class CMasterQueue {
  @ApiProperty({
    type: String,
    example: `queue-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string
}

export class MasterQueueAddDTO {
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
    example: 'Extra remark',
    description: '',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string
}

export class MasterQueueEditDTO {
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
