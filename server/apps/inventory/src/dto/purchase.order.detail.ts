import { IMasterItem } from '@gateway_core/master/interface/master.item'
import { ApiProperty } from '@nestjs/swagger'
import { MasterItemJoin } from '@schemas/master/master.item'

export class CPurchaseOrderDetail {
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
  price: number

  @ApiProperty({
    type: String,
    example: 'n',
    enum: ['p', 'v', 'n'],
    description: 'P = Percentage; V = Value; N = None',
    default: 'n',
  })
  discount_type: string

  @ApiProperty({
    type: Number,
    example: 10,
  })
  discount_value: number

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
