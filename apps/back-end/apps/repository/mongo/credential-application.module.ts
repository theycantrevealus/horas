import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_CREDENTIAL_APPLICATION } from '@repository/token'
import { CredentialApplicationRepositoryMongo } from './credential-application'
import {
  CredentialApplicationEntity,
  CredentialApplicationSchema,
} from './schema/credential-application'

/**
 * Registers the credential application repository under `REPOSITORY_CREDENTIAL_APPLICATION`.
 */
export const CredentialApplicationRepositoryModule =
  RepositoryModule.forFeature({
    imports: [
      MongooseModule.forFeature(
        [
          {
            name: CredentialApplicationEntity.name,
            schema: CredentialApplicationSchema,
          },
        ],
        MONGO_MAIN_CONNECTION,
      ),
      ChangeHistoryModule,
    ],
    repositories: [
      {
        provide: REPOSITORY_CREDENTIAL_APPLICATION,
        useClass: CredentialApplicationRepositoryMongo,
      },
    ],
  })
