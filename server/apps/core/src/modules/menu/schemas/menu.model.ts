import { IAccount } from '@core/account/interface/account'
import { AccountJoin } from '@core/account/schemas/account.join'
import { IMenuGroup, MenuGroupJoin } from '@core/menu/schemas/menu.group.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export const MenuJoin = raw({
  id: { type: String },
  name: { type: String },
  url: { type: String },
  identifier: { type: String },
})

export interface IMenu {
  id: { type: string }
  name: { type: string }
  url: { type: string }
  identifier: { type: string }
}

export interface IMenuTree {
  id: string
  name: string
  url: string
  icon: string
  group_color: string
  level: number
  show_on_menu: boolean
  show_order: number
  items: IMenuTree[]
}

export interface IMenuTreeManager {
  id: string
  key: string
  label: string
  to: string
  show_on_menu: boolean
  data: any
  icon: string
  children: IMenuTreeManager[]
}

export class CMenu {
  @ApiProperty({
    type: String,
    example: `menu-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'Menu Name',
  })
  name: string

  @ApiProperty({
    type: String,
    example: '/',
  })
  url: string

  @ApiProperty({
    type: String,
    example: '',
  })
  identifier: string
}

export interface IMenuPermission {
  domIdentity: string
  dispatchName: string
  menu: IMenu
}

export const MenuPermissionJoin = raw({
  domIdentity: { type: String },
  dispatchName: { type: String },
  menu: { type: MenuJoin, _id: false },
})

export class CMenuPermission {
  @ApiProperty({
    type: String,
    example: '',
  })
  domIdentity: string

  @ApiProperty({
    type: String,
    example: '',
  })
  dispatchName: string

  @ApiProperty({
    type: CMenu,
  })
  menu: CMenu
}

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

  @Prop(raw(AccountJoin))
  created_by: IAccount

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

export const MenuSchema = SchemaFactory.createForClass(Menu)
