import { ApiProperty } from '@nestjs/swagger'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { MasterItemJoin } from '@schemas/master/master.item.join'

export class CMaterialRequisitionDetail {
  @ApiProperty({
    type: MasterItemJoin,
    required: true,
  })
  item: IMasterItem

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty: number

  @ApiProperty({
    type: Number,
    example: 102000.01,
  })
  issued: number

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
