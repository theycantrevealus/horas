import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { MasterDrugIngredientSchema } from '@schemas/master/master.drug.ingredient'
import { MasterItemOtherIngredientSchema } from '@schemas/master/master.other.property'
import { Schema as MongooseSchema } from 'mongoose'

export enum MasterItemStructures {
  Drug = 'drug',
  Other = 'other',
}

@Schema({ _id: false, discriminatorKey: 'type' })
export class MasterItemStructureCoordinator {
  @Prop({
    type: String,
    enum: Object.values(MasterItemStructures),
    required: true,
  })
  type!: MasterItemStructures
}

export const MasterItemStructureCoordinatorSchema =
  SchemaFactory.createForClass(MasterItemStructureCoordinator)

export function registerMasterItemStructureSchemaDiscriminator(
  masterItemStructureSchema: MongooseSchema.Types.Subdocument
): void {
  masterItemStructureSchema.discriminator(
    MasterItemStructures.Drug,
    MasterDrugIngredientSchema
  )

  masterItemStructureSchema.discriminator(
    MasterItemStructures.Other,
    MasterItemOtherIngredientSchema
  )
}
// type TClass<T = any> = new (...args: any[]) => T
// export function initDiscriminators<T extends TClass>(
//   rootClass: T,
//   path: string,
//   discriminators: DiscriminatorOptions[]
// ): MongoSchema<T> {
//   const root = SchemaFactory.createForClass(rootClass)
//   const child = root.path(path)
//
//   discriminators.forEach((discriminator) => {
//     if (discriminator && child)
//       child['discriminator'](discriminator.name, discriminator.schema)
//   })
//
//   return root
// }
