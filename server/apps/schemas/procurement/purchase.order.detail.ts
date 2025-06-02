import { raw } from '@nestjs/mongoose'
import { MasterItemJoin } from '@schemas/master/master.item.join'

export const PurchaseOrderDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  delivered: { type: Number, example: 5, default: 0 },
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
