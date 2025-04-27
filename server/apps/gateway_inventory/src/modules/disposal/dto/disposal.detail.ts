import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export class CStockDisposalDetail {
  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  batch: IMasterItemBatch

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty: number

  @ApiProperty({
    type: String,
    enum: [
      'Expired Products',
      'Damaged Goods',
      'Obsolete Products',
      'Quality Issues',
    ],
    example: 'Damaged Goods',
  })
  type: string

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
