import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator'

export class StockAssignDTO {
  @ApiProperty({
    example: 'account-xxxxxxxxx',
    description: 'Account ID',
  })
  @IsNotEmpty()
  account: string

  @ApiProperty({
    isArray: true,
    example: ['stock_point-xxxxxxxxx'],
    description: 'Stock Point ID',
    default: [],
  })
  @IsArray()
  @IsNotEmpty()
  stock_point: string[]
}

export class GeneralItemDetailDTO {
  @ApiProperty({
    type: CMasterItem,
    required: true,
  })
  @IsNotEmpty()
  @Type(() => CMasterItem)
  @ValidateNested()
  item: IMasterItem

  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  @IsNotEmpty()
  @Type(() => CMasterItemBatch)
  @ValidateNested()
  batch: IMasterItemBatch

  @ApiProperty({
    type: Number,
    example: 10,
  })
  @IsNumber()
  qty: number

  @ApiProperty({
    type: String,
    description: 'Extra remark for each item',
    example: '-',
  })
  @IsString()
  remark: string
}

export class StockTransferDTO {
  @ApiProperty({
    type: String,
    description:
      'Perform scheduled or backdate process in case of non-actual transfer. If not set/empty then it will get current time',
    example: '2024-08-10 10:00:00',
  })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  transfer_date: string

  @ApiProperty({
    type: [GeneralItemDetailDTO],
    description: 'Item to transfer',
  })
  @IsNotEmpty()
  @IsArray()
  // @Type(() => GeneralItemDetailDTO)
  // @ValidateNested()
  item: GeneralItemDetailDTO[]

  @ApiProperty({
    type: CMasterStockPoint,
    isArray: false,
    description: 'Stock origin of the items',
    example: {
      id: 'stock_point-xxxxxxxxxxx',
      code: 'EXSTCK0001',
      name: 'Example Stock Point Name',
    },
  })
  @IsNotEmpty()
  @Type(() => CMasterStockPoint)
  @ValidateNested()
  from: IMasterStockPoint

  @ApiProperty({
    type: CMasterStockPoint,
    isArray: false,
    description: 'Stock origin of the items',
    example: {
      id: 'stock_point-xxxxxxxxxxx',
      code: 'EXSTCK0001',
      name: 'Example Stock Point Name',
    },
  })
  @IsNotEmpty()
  @Type(() => CMasterStockPoint)
  @ValidateNested()
  to: IMasterStockPoint

  @ApiProperty({
    type: String,
    description:
      'Extra remark for transfer activity. Highly recomended to describe as detailed as possible',
    example: '-',
  })
  @IsString()
  remark: string
}

export class StockInitiateDTO {
  @ApiProperty({
    type: String,
    description: 'Custom transaction ID. If not set, it will follow system',
    required: false,
    example: '',
  })
  @IsString()
  transaction_id?: string

  @ApiProperty({
    type: CMasterStockPoint,
    isArray: false,
    description: 'Stock origin of the items',
    example: {
      id: 'stock_point-xxxxxxxxxxx',
      code: 'EXSTCK0001',
      name: 'Example Stock Point Name',
    },
  })
  @IsNotEmpty()
  @Type(() => CMasterStockPoint)
  @ValidateNested()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: [GeneralItemDetailDTO],
    description: 'Item to transfer',
  })
  @IsNotEmpty()
  @IsArray()
  @Type(() => GeneralItemDetailDTO)
  @ValidateNested()
  item: GeneralItemDetailDTO[]
}
