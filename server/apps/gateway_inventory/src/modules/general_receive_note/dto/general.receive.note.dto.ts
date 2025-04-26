import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { CPurchaseOrder } from '@gateway_inventory/purchase_order/dto/purchase.order'
import { IPurchaseOrder } from '@inventory/interface/purchase.order'
import { ApiProperty } from '@nestjs/swagger'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

export class CGeneralReceiveNoteDetail {
  @ApiProperty({
    type: CMasterItem,
    required: true,
  })
  @Type(() => CMasterItem)
  @ValidateNested({
    each: true,
  })
  item: CMasterItem

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty: number

  @ApiProperty({
    type: String,
    example: 'XXXXX',
  })
  batch: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Expired date',
  })
  @IsNotEmpty()
  expired: Date

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}

export class GeneralReceiveNoteAddDTO {
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

  // @ApiProperty({
  //   type: CCurrency,
  //   description: 'Currency',
  // })
  // @IsNotEmpty()
  // @Type(() => CCurrency)
  // @ValidateNested({ each: true })
  // locale: ICurrency

  @ApiProperty({
    type: CMasterStockPoint,
    description: 'Target stock point',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CPurchaseOrder,
    description: 'Purchase Order',
  })
  @Type(() => CPurchaseOrder)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  purchase_order: CPurchaseOrder

  @ApiProperty({
    type: CGeneralReceiveNoteDetail,
    isArray: true,
    description: 'Purchase item(s)',
  })
  @Type(() => CGeneralReceiveNoteDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CGeneralReceiveNoteDetail[]

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

export class GeneralReceiveNoteEditDTO {
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
    type: CMasterStockPoint,
    description: 'Target stock point',
  })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CPurchaseOrder,
    description: 'Purchase Order',
  })
  @Type(() => CPurchaseOrder)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  purchase_order: IPurchaseOrder

  @ApiProperty({
    type: CGeneralReceiveNoteDetail,
    isArray: true,
    description: 'Purchase item(s)',
  })
  @Type(() => CGeneralReceiveNoteDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CGeneralReceiveNoteDetail[]

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
