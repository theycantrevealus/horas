import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
export class MasterOtherProperty {
  @Prop({ required: true })
  any_item!: string
}

export const MasterItemOtherIngredientSchema =
  SchemaFactory.createForClass(MasterOtherProperty)
