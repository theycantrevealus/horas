import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { IsNotEmpty, IsNumber } from 'class-validator'

export class StockDTO {
  @ApiProperty({
    type: CMasterItem,
    required: true,
  })
  item: IMasterItem

  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  batch: CMasterItemBatch

  @ApiProperty({
    type: CMasterStockPoint,
    required: true,
  })
  stock_point: IMasterStockPoint

  @ApiProperty({
    example: 0,
    description: 'Item quantity',
    required: false,
    default: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  qty?: number
}
