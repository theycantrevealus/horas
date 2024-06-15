import { IAccount } from '@core/account/interface/account'
import { IMenuGroup } from '@core/menu/interfaces/menu.group.interface'
import { IMenuPermission } from '@core/menu/interfaces/menu.permission.interface'
import { MenuGroupJoin } from '@core/menu/schemas/menu.group.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.join'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const MenuJoin = raw({
  id: { type: String },
  name: { type: String },
  url: { type: String },
  identifier: { type: String },
})

export const MenuPermissionJoin = raw({
  domIdentity: { type: String },
  dispatchName: { type: String },
  menu: { type: MenuJoin, _id: false },
})

export type MenuDocument = HydratedDocument<Menu>
@Schema({ collection: 'core_menu' })
export class Menu {
  @Prop({ type: SchemaTypes.String })
  id: string

  @Prop({ type: SchemaTypes.String })
  name: string

  @Prop({ type: SchemaTypes.String })
  identifier: string

  @Prop({ type: SchemaTypes.String })
  url: string

  @Prop({ type: SchemaTypes.String })
  icon: string

  @Prop({ type: SchemaTypes.Boolean })
  show_on_menu: boolean

  @Prop({ type: SchemaTypes.Number })
  show_order: number

  @Prop({
    unique: false,
    type: [MenuPermissionJoin],
    _id: false,
  })
  permission: IMenuPermission

  @Prop({ type: SchemaTypes.Number })
  level: number

  @Prop({ type: SchemaTypes.String })
  group_color: string

  @Prop({ type: SchemaTypes.String })
  timezone: string

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['web', 'android', 'ios', 'windows', 'linux'],
  })
  channel: string

  @Prop(raw(MenuGroupJoin))
  menu_group: IMenuGroup

  @Prop({ type: SchemaTypes.String })
  parent: string

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

export const MenuSchema = SchemaFactory.createForClass(Menu)
