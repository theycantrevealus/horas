import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'

export class CStockInitiationDetail {
  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  batch: CMasterItemBatch

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty: number

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
