import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

/**
 * Mongo storage shape of an `AddressAdminLevel`.
 *
 * @property level - Level number.
 * @property code - Official code of the area.
 * @property name - Name of the area.
 */
@Schema({ _id: false })
export class AddressAdminLevelEntity {
  @Prop({ type: SchemaTypes.Number, required: true })
  level!: number

  @Prop({ type: SchemaTypes.String })
  code?: string

  @Prop({ type: SchemaTypes.String, required: true })
  name!: string
}

/**
 * Mongoose schema of an embedded address administrative level.
 */
export const AddressAdminLevelSchema = SchemaFactory.createForClass(
  AddressAdminLevelEntity,
)

/**
 * Mongo storage shape of an `Address`.
 *
 * @property use - Purpose of the address.
 * @property lines - Street, building, RT/RW.
 * @property admin_levels - Local administrative levels.
 * @property city - City or town.
 * @property subdivision - ISO 3166-2 code.
 * @property postal_code - Postal code.
 * @property country - ISO 3166-1 alpha-2 code.
 */
@Schema({ _id: false })
export class AddressEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['home', 'work', 'temp', 'mailing'],
    required: true,
  })
  use!: 'home' | 'work' | 'temp' | 'mailing'

  @Prop({ type: [SchemaTypes.String], default: [] })
  lines!: string[]

  @Prop({ type: [AddressAdminLevelSchema], default: [] })
  admin_levels!: AddressAdminLevelEntity[]

  @Prop({ type: SchemaTypes.String })
  city?: string

  @Prop({ type: SchemaTypes.String })
  subdivision?: string

  @Prop({ type: SchemaTypes.String })
  postal_code?: string

  @Prop({ type: SchemaTypes.String, required: true })
  country!: string
}

/**
 * Mongoose schema of an embedded address.
 */
export const AddressSchema = SchemaFactory.createForClass(AddressEntity)
