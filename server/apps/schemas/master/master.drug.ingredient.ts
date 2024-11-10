import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
export class MasterDrugIngredient {
  @Prop({ required: true })
  ingredient!: string
}

export const MasterDrugIngredientSchema =
  SchemaFactory.createForClass(MasterDrugIngredient)
