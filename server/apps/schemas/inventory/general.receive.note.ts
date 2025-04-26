import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { IGeneralReceiveNoteDetail } from '@inventory/interface/general.receive.note.detail'
import { IPurchaseOrder } from '@inventory/interface/purchase.order'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { GeneralReceiveNoteDetail } from '@schemas/inventory/general.receive.note.detail'
import { PurchaseOrderJoin } from '@schemas/inventory/purchase.order.join'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type GeneralReceiveNoteDocument = HydratedDocument<GeneralReceiveNote>

@Schema({ collection: 'inventory_general_receive_note' })
export class GeneralReceiveNote {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  /**
   * @type { ILocale }
   * @description Stock adjustment locale
   */
  @Prop(LocaleJoin)
  locale: ILocale

  @Prop(MasterStockPointJoin)
  stock_point: IMasterStockPoint

  @Prop(PurchaseOrderJoin)
  purchase_order: IPurchaseOrder

  @Prop({
    type: [GeneralReceiveNoteDetail],
    _id: false,
  })
  detail: IGeneralReceiveNoteDetail[]

  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccount

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const GeneralReceiveNoteSchema =
  SchemaFactory.createForClass(GeneralReceiveNote)
