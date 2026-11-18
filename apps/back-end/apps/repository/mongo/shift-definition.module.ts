import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_SHIFT_DEFINITION } from '@repository/token'
import { ShiftDefinitionRepositoryMongo } from './shift-definition'
import {
  ShiftDefinitionEntity,
  ShiftDefinitionSchema,
} from './schema/shift-definition'

/**
 * Registers the shift definition repository under `REPOSITORY_SHIFT_DEFINITION`.
 */
export const ShiftDefinitionRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: ShiftDefinitionEntity.name, schema: ShiftDefinitionSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_SHIFT_DEFINITION,
      useClass: ShiftDefinitionRepositoryMongo,
    },
  ],
})
