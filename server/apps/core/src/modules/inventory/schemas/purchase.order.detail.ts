import {
  IMasterItem,
  MasterItemJoin,
} from '@core/master/schemas/master.item.join'
import { raw } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'

export const PurchaseOrderDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  price: { type: Number, example: 102000.01 },
  discount_type: {
    type: String,
    example: 'n',
    enum: ['p', 'v', 'n'],
    description: 'P = Percentage; V = Value; N = None',
    default: 'n',
  },
  discount_value: { type: Number, example: 10 },
  total: { type: Number, example: 1002000.01 },
  remark: { type: String, example: 'Another remark for an item' },
})

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

export class IPurchaseOrderDetail {
  item: IMasterItem

  qty: number

  price: number

  total: number

  discount_type: string

  discount_value: number

  remark: string

  constructor(data: any) {
    this.item = data.item
    this.qty = data.qty
    this.price = data.price
    this.qty = data.qty
    this.total = data.total
    this.discount_type = data.discount_type
    this.discount_value = data.discount_value
  }
}
