import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, MaxLength, MinLength } from 'class-validator'

export class MasterStockPointAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item brand',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Main Storage',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
  })
  @IsNotEmpty()
  remark: string

  constructor(parameter: any) {
    this.code = parameter.code
    this.name = parameter.name
    this.remark = parameter.remark
  }
}

export class MasterStockPointEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item brand',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Main Storage',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

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
    this.code = parameter.code
    this.name = parameter.name
    this.remark = parameter.remark
    this.__v = parameter.__v
  }
}
