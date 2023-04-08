import {
  IMasterItemSupplier,
  MasterItemSupplierJoin,
} from '@core/master/schemas/master.item.supplier.join'
import { CPurchaseOrderDetail } from '@inventory/schemas/purchase.order.detail'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

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
    type: MasterItemSupplierJoin,
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
    type: MasterItemSupplierJoin,
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
    enum: ['new', 'approved', 'declined'],
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
