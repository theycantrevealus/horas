import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { IsNotEmpty, IsOptional } from 'class-validator'

export class StockLogDTO {
  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  @IsNotEmpty()
  batch: IMasterItemBatch

  @ApiProperty({
    type: CMasterStockPoint,
    required: false,
    description:
      'Stock Point Origin. It can be empty, example case : General Received Note has no origin stock point, it is pure stock in',
  })
  @IsOptional()
  from: IMasterStockPoint

  @ApiProperty({
    type: CMasterStockPoint,
    required: false,
    description:
      'Stock Point Target. It can be empty, example case : Stock Disposal',
  })
  @IsOptional()
  to: IMasterStockPoint

  @ApiProperty({
    type: Number,
    example: 0,
  })
  qty: number

  // @ApiProperty({
  //   type: Number,
  //   example: 0,
  //   description: 'Origin Stock Point balance before process',
  // })
  // balance_from: number

  // @ApiProperty({
  //   type: Number,
  //   example: 0,
  //   description: 'Target Stock Point balance before process',
  // })
  // balance_to: number

  @ApiProperty({
    type: String,
    example: 0,
    description:
      'Transaction ID that effect the stock change. For example: GRN code, Opname code, Mutate Stock code',
  })
  transaction_id: string
}
