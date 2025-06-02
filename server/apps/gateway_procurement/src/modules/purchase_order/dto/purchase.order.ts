import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import { Types } from 'mongoose'

export class CPurchaseOrderDetail {
  @ApiProperty({
    type: CMasterItem,
    required: true,
  })
  item: CMasterItem

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty: number

  @ApiProperty({
    type: Number,
    example: 102000.01,
  })
  price: number

  @ApiProperty({
    type: String,
    example: 'n',
    enum: ['p', 'v', 'n'],
    description: 'P = Percentage; V = Value; N = None',
    default: 'n',
  })
  discount_type: string

  @ApiProperty({
    type: Number,
    example: 10,
  })
  discount_value: number

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}

export class CPurchaseOrder {
  @ApiProperty({
    type: String,
    example: `purchase_order-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    description: 'Supplier ID',
  })
  @IsNotEmpty()
  @IsString()
  supplier: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Purchase date',
  })
  @IsNotEmpty()
  purchase_date: Date

  @ApiProperty({
    example: 'Extra description',
    description: '',
  })
  @IsNotEmpty()
  remark: string
}

export class PurchaseOrderAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    description: 'Unique code. Left it blank so it will generate auto code',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string

  @ApiProperty({
    type: String,
    description: 'Supplier ID',
  })
  @IsNotEmpty()
  @IsString()
  supplier: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Purchase date',
  })
  @IsNotEmpty()
  purchase_date: Date

  @ApiProperty({
    example: 'xxx-xxxx',
    description: 'Purchase requisition id',
  })
  @IsNotEmpty()
  purchase_requisition: string

  @ApiProperty({
    type: CPurchaseOrderDetail,
    isArray: true,
    description: 'Purchase item(s)',
  })
  @Type(() => CPurchaseOrderDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CPurchaseOrderDetail[]

  @ApiProperty({
    example: 'n',
    enum: ['p', 'v', 'n'],
    description: 'P = Percentage; V = Value; N = None',
  })
  @IsNotEmpty()
  discount_type: string

  @ApiProperty({
    example: 0,
    type: Number,
    description: '',
  })
  @IsNotEmpty()
  discount_value: number

  @ApiProperty({
    example: '',
    description: 'Any extra object',
    required: false,
  })
  @IsOptional()
  extras: any

  @ApiProperty({
    example: 'Extra description',
    description: '',
  })
  @IsNotEmpty()
  remark: string
}

export class PurchaseOrderEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    description: 'Unique code. Left it blank so it will generate auto code',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string

  @ApiProperty({
    type: String,
    description: 'Supplier ID',
  })
  @IsNotEmpty()
  @IsString()
  supplier: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Purchase date',
  })
  @IsNotEmpty()
  purchase_date: Date

  @ApiProperty({
    example: 'xxx-xxxx',
    description: 'Purchase requisition id',
  })
  @IsNotEmpty()
  purchase_requisition: string

  @ApiProperty({
    type: CPurchaseOrderDetail,
    isArray: true,
    description: 'Purchase item(s)',
  })
  @Type(() => CPurchaseOrderDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CPurchaseOrderDetail[]

  @ApiProperty({
    example: 'n',
    enum: ['p', 'v', 'n'],
    description: 'p = Percentage; v = Value; n = None',
  })
  @IsNotEmpty()
  discount_type: string

  @ApiProperty({
    example: 0,
    type: Number,
    description: '',
  })
  @IsNotEmpty()
  discount_value: number

  @ApiProperty({
    example: '',
    description: 'Any extra object',
    required: false,
  })
  @IsOptional()
  extras: any

  @ApiProperty({
    example: 'Extra description',
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
