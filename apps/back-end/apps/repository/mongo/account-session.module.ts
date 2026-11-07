import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ACCOUNT_SESSION } from '@repository/token'
import { AccountSessionRepositoryMongo } from './account-session'
import {
  AccountSessionEntity,
  AccountSessionSchema,
} from './schema/account-session'

/**
 * Account session repository on the main Mongo connection.
 * Import it in any feature module that injects `REPOSITORY_ACCOUNT_SESSION`.
 */
export const AccountSessionRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: AccountSessionEntity.name, schema: AccountSessionSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_ACCOUNT_SESSION,
      useClass: AccountSessionRepositoryMongo,
    },
  ],
})
