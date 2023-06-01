import { AccountJoin } from '@core/account/schemas/account.join'
import { Account } from '@core/account/schemas/account.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type MenuGroupDocument = HydratedDocument<MenuGroup>
@Schema({ collection: 'core_menu_group' })
export class MenuGroup {
  @Prop({ type: SchemaTypes.String })
  id: string

  @Prop({ type: SchemaTypes.String })
  name: string

  @Prop({ type: SchemaTypes.String })
  description: string

  @Prop(raw(AccountJoin))
  created_by: Account

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

export const MenuGroupSchema = SchemaFactory.createForClass(MenuGroup)

export const MenuGroupJoin = raw({
  id: { type: String },
  name: { type: String },
})

export interface IMenuGroup {
  id: string
  name: string
}

export class CMenuGroup {
  @ApiProperty({
    type: String,
    example: `menu_group-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'Menu Group Name',
  })
  name: string
}
