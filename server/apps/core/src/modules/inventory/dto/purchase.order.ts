import { CPurchaseOrderDetail } from '@core/inventory/schemas/purchase.order.detail'
import {
  IMasterItemSupplier,
  MasterItemSupplierJoin,
} from '@core/master/schemas/master.item.supplier.join'
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
    example: 'Extra description',
    description: '',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  remark: string

  constructor(parameter: any) {
    this.code = parameter.code
    this.remark = parameter.remark
  }
}

export class PurchaseOrderEditDTO {
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
    example: 'Adidas',
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