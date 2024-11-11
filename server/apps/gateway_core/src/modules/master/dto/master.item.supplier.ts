import { Prop } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator'
import { SchemaTypes, Types } from 'mongoose'

export class CMasterItemSupplier {
  @ApiProperty({
    type: String,
    example: `supplier-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Drugs',
  })
  name: string
}

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
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string
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
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  __v: number
}
