import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import {
  GeneralReceiveNoteDetail,
  IGeneralReceiveNoteDetail,
} from '@core/inventory/schemas/general.receive.note.detail'
import {
  IPurchaseOrder,
  PurchaseOrderJoin,
} from '@core/inventory/schemas/purchase.order'
import {
  IMasterStockPoint,
  MasterStockPointJoin,
} from '@core/master/schemas/master.stock.point.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type GeneralReceiveNoteDocument = HydratedDocument<GeneralReceiveNote>
@Schema({ collection: 'inventory_general_receive_note' })
export class GeneralReceiveNote {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  @Prop(raw(MasterStockPointJoin))
  stock_point: IMasterStockPoint

  @Prop(raw(PurchaseOrderJoin))
  purchase_order: IPurchaseOrder

  @Prop({
    type: [GeneralReceiveNoteDetail],
    _id: false,
  })
  detail: IGeneralReceiveNoteDetail

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const GeneralReceiveNoteSchema =
  SchemaFactory.createForClass(GeneralReceiveNote)
