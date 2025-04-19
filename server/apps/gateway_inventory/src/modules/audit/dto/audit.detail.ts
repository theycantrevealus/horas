import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export class CStockAuditDetail {
  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  batch: IMasterItemBatch

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty_actual: number

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
