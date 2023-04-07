import { CGeneralReceiveNoteDetail } from '@core/inventory/schemas/general.receive.note.detail'
import {
  IPurchaseOrder,
  PurchaseOrderJoin,
} from '@core/inventory/schemas/purchase.order'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

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

  @ApiProperty({
    example: '',
    description: 'Any extra object',
  })
  @IsNotEmpty()
  extras: any

  @ApiProperty({
    type: PurchaseOrderJoin,
    description: 'Purchase Order',
  })
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
    type: PurchaseOrderJoin,
    description: 'Purchase Order',
  })
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
