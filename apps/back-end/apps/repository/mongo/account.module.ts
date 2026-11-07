import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ACCOUNT } from '@repository/token'
import { AccountRepositoryMongo } from './account'
import { AccountEntity, AccountSchema } from './schema/account'

/**
 * Account repository on the main Mongo connection.
 * Import it in any feature module that injects `REPOSITORY_ACCOUNT`.
 */
export const AccountRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: AccountEntity.name, schema: AccountSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_ACCOUNT, useClass: AccountRepositoryMongo },
  ],
})
