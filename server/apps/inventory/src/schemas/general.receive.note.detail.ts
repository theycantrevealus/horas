import {
  IMasterItem,
  MasterItemJoin,
} from '@core/master/schemas/master.item.join'
import { raw } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export const GeneralReceiveNoteDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  pending: { type: Number, example: 5 },
  batch: { type: String, example: 'XXXX' },
  storing_label: { type: String, example: 'XXXX' },
  expired_date: { type: Date },
  remark: { type: String, example: 'Another remark for an item' },
})

export class IGeneralReceiveNoteDetail {
  item: IMasterItem

  qty: number

  pending: number

  batch: string

  storing_label: string

  expired_date: Date

  remark: string

  constructor(data: any) {
    this.item = data.item
    this.qty = data.qty
    this.pending = data.pending
    this.batch = data.batch
    this.storing_label = data.storing_label
    this.expired_date = data.expired_date
    this.remark = data.remark
  }
}

export class CGeneralReceiveNoteDetail {
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
    type: String,
    example: 'XXXXX',
  })
  batch: string

  @ApiProperty({
    type: String,
    example: 'XXXXX',
    required: false,
    description: 'Storing label to tracking',
  })
  storing_label: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Expired date',
  })
  @IsNotEmpty()
  expired_date: Date

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
