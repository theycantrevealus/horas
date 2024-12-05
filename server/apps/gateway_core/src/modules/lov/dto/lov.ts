import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { Types } from 'mongoose'

export class LOVAddDTO {
  @ApiProperty({
    example: '',
    description: 'LOV group code',
  })
  @IsNotEmpty()
  group: string

  @ApiProperty({
    example: '',
    description: 'LOV identifier',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: `lov-${new Types.ObjectId().toString()}`,
    required: false,
    description: 'Another lov as parent',
  })
  @IsString()
  parent: string

  @ApiProperty({
    example: 'Extra remark',
    required: false,
    description: 'Item brand extra remark',
  })
  @IsNotEmpty()
  remark: string
}

export class LOVEditDTO {
  @ApiProperty({
    example: '',
    description: 'LOV group code',
  })
  @IsNotEmpty()
  group: string

  @ApiProperty({
    example: 'Adidas',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: `lov-${new Types.ObjectId().toString()}`,
    required: false,
    description: 'Another lov as parent',
  })
  @IsString()
  parent: string

  @ApiProperty({
    example: 'Extra remark',
    required: false,
    description: 'Item brand extra remark',
  })
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Item brand document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}

export class CLOV {
  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  id: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  name: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  value: string
}
