import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class AuthorityAddDTO {
  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  remark: string

  constructor(data: any = {}) {
    this.code = data.code
    this.name = data.name
    this.remark = data.remark
  }
}

export class AuthorityEditDTO {
  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number

  constructor(data: any = {}) {
    this.code = data.code
    this.name = data.name
    this.remark = data.remark
    this.__v = data.__v
  }
}
