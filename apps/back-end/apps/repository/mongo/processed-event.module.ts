import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_PROCESSED_EVENT } from '@repository/token'
import { ProcessedEventRepositoryMongo } from './processed-event'
import {
  ProcessedEventEntity,
  ProcessedEventSchema,
} from './schema/processed-event'

/**
 * Processed event repository on the main Mongo connection. Import it in the module of an event
 * consumer that injects `REPOSITORY_PROCESSED_EVENT`.
 */
export const ProcessedEventRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: ProcessedEventEntity.name, schema: ProcessedEventSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_PROCESSED_EVENT,
      useClass: ProcessedEventRepositoryMongo,
    },
  ],
})
