import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber } from 'class-validator'
import { Types } from 'mongoose'

export class LOVAddDTO {
  @ApiProperty({
    example: '',
    description: 'LOV identifier',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: `lov-${new Types.ObjectId().toString()}`,
    description: 'Another lov as parent',
  })
  @IsNotEmpty()
  parent: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
  })
  @IsNotEmpty()
  remark: string

  constructor(parameter: any) {
    this.name = parameter.name
    ;(this.parent = parameter.parent), (this.remark = parameter.remark)
  }
}

export class LOVEditDTO {
  @ApiProperty({
    example: 'Adidas',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: `lov-${new Types.ObjectId().toString()}`,
    description: 'Another lov as parent',
  })
  @IsNotEmpty()
  parent: string

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
    this.name = parameter.name
    this.parent = parameter.parent
    this.remark = parameter.remark
    this.__v = parameter.__v
  }
}
