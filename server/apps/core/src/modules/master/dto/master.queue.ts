import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, MaxLength, MinLength } from 'class-validator'

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
  })
  @IsNotEmpty()
  remark: string
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
  })
  @IsNotEmpty()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
