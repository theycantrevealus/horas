import { Prop } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
} from 'class-validator'
import { SchemaTypes } from 'mongoose'

export class MasterItemSupplierAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item supplier',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Example Co. Ltd.',
    description: 'Item supplier name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: '(XX)XXXXXXXX',
    description: 'Item supplier phone contact',
  })
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  phone: string

  @ApiProperty({
    example: 'example@company.com',
    description: 'Item supplier email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    example: 'John Doe',
    description: 'Item supplier sales for contact person',
  })
  @IsNotEmpty()
  sales_name: string

  @ApiProperty({
    example: '15th Avenue',
    description: 'Item supplier address',
  })
  @IsNotEmpty()
  address: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item supplier extra remark',
  })
  @IsNotEmpty()
  remark: string

  constructor(parameter: any) {
    this.code = parameter.code
    this.name = parameter.name
    this.phone = parameter.phone
    this.email = parameter.email
    this.sales_name = parameter.sales_name
    this.address = parameter.address
    this.remark = parameter.remark
  }
}

export class MasterItemSupplierEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item supplier',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Example Co. Ltd.',
    description: 'Item supplier name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: '(XX)XXXXXXXX',
    description: 'Item supplier phone contact',
  })
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  phone: string

  @ApiProperty({
    example: 'example@company.com',
    description: 'Item supplier email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    example: 'John Doe',
    description: 'Item supplier sales for contact person',
  })
  @IsNotEmpty()
  sales_name: string

  @ApiProperty({
    example: '15th Avenue',
    description: 'Item supplier address',
  })
  @IsNotEmpty()
  address: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item supplier extra remark',
  })
  @IsNotEmpty()
  remark: string

  @IsNotEmpty()
  @IsNumber()
  __v: number

  constructor(parameter: any) {
    this.code = parameter.code
    this.name = parameter.name
    this.phone = parameter.phone
    this.email = parameter.email
    this.sales_name = parameter.sales_name
    this.address = parameter.address
    this.remark = parameter.remark
  }
}
