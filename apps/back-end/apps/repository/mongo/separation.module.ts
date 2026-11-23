import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_SEPARATION } from '@repository/token'
import { SeparationRepositoryMongo } from './separation'
import { SeparationEntity, SeparationSchema } from './schema/separation'

/**
 * Registers the separation repository on the main Mongo connection.
 */
export const SeparationRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: SeparationEntity.name, schema: SeparationSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_SEPARATION, useClass: SeparationRepositoryMongo },
  ],
})
