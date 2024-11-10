import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { IMasterItem } from '@gateway_core/master/interface/master.item'
import { IMasterItemBatch } from '@gateway_core/master/interface/master.item.batch'
import { IMasterStockPoint } from '@gateway_core/master/interface/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'

export class StockLogDTO {
  @ApiProperty({
    type: CMasterItem,
    required: true,
  })
  item: IMasterItem

  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  batch: IMasterItemBatch

  @ApiProperty({
    type: CMasterStockPoint,
    required: false,
    description:
      'Stock Point origin. It can be empty, example case : General Received Note has no origin stock point, it is pure stock in',
  })
  from: IMasterStockPoint

  @ApiProperty({
    type: CMasterStockPoint,
    required: true,
    description: 'Stock target to add',
  })
  to: IMasterStockPoint

  @ApiProperty({
    type: Number,
    example: 0,
  })
  qty: number

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Balance before process',
  })
  balance: number

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Stock point target balance before process',
  })
  balance_to: number

  @ApiProperty({
    type: String,
    example: 0,
    description:
      'Transaction ID that effect the stock change. For example: GRN code, Opname code, Mutate Stock code',
  })
  transaction_id: string
}
