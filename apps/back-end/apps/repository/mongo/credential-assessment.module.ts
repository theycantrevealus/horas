import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_CREDENTIAL_ASSESSMENT } from '@repository/token'
import { CredentialAssessmentRepositoryMongo } from './credential-assessment'
import {
  CredentialAssessmentEntity,
  CredentialAssessmentSchema,
} from './schema/credential-assessment'

/**
 * Registers the credential assessment repository under `REPOSITORY_CREDENTIAL_ASSESSMENT`.
 */
export const CredentialAssessmentRepositoryModule =
  RepositoryModule.forFeature({
    imports: [
      MongooseModule.forFeature(
        [
          {
            name: CredentialAssessmentEntity.name,
            schema: CredentialAssessmentSchema,
          },
        ],
        MONGO_MAIN_CONNECTION,
      ),
      ChangeHistoryModule,
    ],
    repositories: [
      {
        provide: REPOSITORY_CREDENTIAL_ASSESSMENT,
        useClass: CredentialAssessmentRepositoryMongo,
      },
    ],
  })
