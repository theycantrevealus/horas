import { CCurrency, ICurrency } from '@core/i18n/schemas/i18n'
import { CMasterItemSupplier } from '@core/master/dto/master.item.supplier'
import { IMasterItemSupplier } from '@core/master/interface/master.item.supplier'
import { CPurchaseOrderDetail } from '@inventory/dto/purchase.order.detail'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Types } from 'mongoose'

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
    type: CMasterItemSupplier,
  })
  @Type(() => CMasterItemSupplier)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  supplier: IMasterItemSupplier

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
    minLength: 8,
    maxLength: 24,
    description: 'Unique code. Left it blank so it will generate auto code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: '',
    description: 'Any extra object',
  })
  @IsNotEmpty()
  extras: any

  @ApiProperty({
    type: CMasterItemSupplier,
    description: 'Supplier info',
  })
  @IsNotEmpty()
  supplier: IMasterItemSupplier

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Purchase date',
  })
  @IsNotEmpty()
  purchase_date: Date

  @ApiProperty({
    type: CCurrency,
    description: 'Currency',
  })
  @IsNotEmpty()
  @Type(() => CCurrency)
  @ValidateNested({ each: true })
  locale: ICurrency

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
    example: 'Extra description',
    description: '',
  })
  @IsNotEmpty()
  remark: string
}

export class PurchaseOrderEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code. Left it blank so it will generate auto code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: '',
    description: 'Any extra object',
  })
  @IsNotEmpty()
  extras: any

  @ApiProperty({
    type: CMasterItemSupplier,
    description: 'Supplier info',
  })
  @IsNotEmpty()
  supplier: IMasterItemSupplier

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Purchase date',
  })
  @IsNotEmpty()
  purchase_date: Date

  @ApiProperty({
    type: CCurrency,
    description: 'Currency',
  })
  @IsNotEmpty()
  @Type(() => CCurrency)
  @ValidateNested({ each: true })
  locale: ICurrency

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
    example: 'Extra description',
    description: '',
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
}

export class PurchaseOrderApproval {
  @ApiProperty({
    example: 'approved',
    enum: ['new', 'need_approval', 'approved', 'declined'],
    description: 'Approval status',
  })
  @IsNotEmpty()
  status: string

  @ApiProperty({
    example: 'Extra description',
    description: '',
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
}
