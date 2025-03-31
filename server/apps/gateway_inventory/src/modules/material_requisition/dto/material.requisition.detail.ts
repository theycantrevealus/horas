import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { ApiProperty } from '@nestjs/swagger'
import { IMasterItem } from '@schemas/master/master.item.interface'

export class CMaterialRequisitionDetail {
  @ApiProperty({
    type: CMasterItem,
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
