import { ApiProperty } from '@nestjs/swagger'
import { CMasterItemBatch } from '@schemas/master/master.item.batch'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export class CGeneralIssueNoteDetail {
  @ApiProperty({
    type: CMasterItemBatch,
    required: true,
  })
  batch: IMasterItemBatch

  @ApiProperty({
    type: Number,
    example: 10,
  })
  issued: number

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
