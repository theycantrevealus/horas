import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ACCOUNT_CREDENTIAL } from '@repository/token'
import { AccountCredentialRepositoryMongo } from './account-credential'
import {
  AccountCredentialEntity,
  AccountCredentialSchema,
} from './schema/account-credential'

/**
 * Account credential repository on the main Mongo connection.
 * Import it in any feature module that injects `REPOSITORY_ACCOUNT_CREDENTIAL`.
 */
export const AccountCredentialRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: AccountCredentialEntity.name, schema: AccountCredentialSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_ACCOUNT_CREDENTIAL,
      useClass: AccountCredentialRepositoryMongo,
    },
  ],
})
