import { AccountJoin } from '@core/account/schemas/account.join'
import { AccountModel } from '@core/account/schemas/account.model'
import { MenuGroupModel } from '@core/menu/schemas/menu.group.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { Type } from 'class-transformer'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type MenuDocument = HydratedDocument<MenuModel>
@Schema({ collection: 'core_menu' })
export class MenuModel {
  @Prop({ type: SchemaTypes.String })
  name: string

  @Prop({ type: SchemaTypes.String })
  identifier: string

  @Prop({ type: SchemaTypes.String })
  url: string

  @Prop({ type: SchemaTypes.String })
  icon: string

  @Prop({ type: SchemaTypes.String })
  show_on_menu: string

  @Prop({ type: SchemaTypes.String })
  show_order: string

  @Prop({ type: SchemaTypes.String })
  level: string

  @Prop({ type: SchemaTypes.String })
  group_color: string

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['web', 'android', 'ios', 'windows', 'linux'],
  })
  channel: string

  @Prop({ type: Types.ObjectId, ref: MenuGroupModel.name })
  @Type(() => MenuGroupModel)
  menu_group: MenuGroupModel

  @Prop(raw(AccountJoin))
  created_by: AccountModel

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

export const MenuSchema = SchemaFactory.createForClass(MenuModel)
