import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_SECURITY_EVENT } from '@repository/token'
import { SecurityEventRepositoryMongo } from './security-event'
import {
  SecurityEventEntity,
  SecurityEventSchema,
} from './schema/security-event'

/**
 * Security event repository on the main Mongo connection.
 * Import it in any feature module that injects `REPOSITORY_SECURITY_EVENT`.
 */
export const SecurityEventRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: SecurityEventEntity.name, schema: SecurityEventSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_SECURITY_EVENT,
      useClass: SecurityEventRepositoryMongo,
    },
  ],
})
