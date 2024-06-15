import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.join'
import { Account } from '@schemas/account/account.model'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MenuGroupDocument = HydratedDocument<MenuGroup>
@Schema({ collection: 'core_menu_group' })
export class MenuGroup {
  @Prop({ type: SchemaTypes.String })
  id: string

  @Prop({ type: SchemaTypes.String })
  name: string

  @Prop({ type: SchemaTypes.String })
  description: string

  @Prop(AccountJoin)
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
