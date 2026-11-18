import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_PROFESSIONAL_LICENSE } from '@repository/token'
import { ProfessionalLicenseRepositoryMongo } from './professional-license'
import {
  ProfessionalLicenseEntity,
  ProfessionalLicenseSchema,
} from './schema/professional-license'

/**
 * Registers the professional license repository under `REPOSITORY_PROFESSIONAL_LICENSE`.
 */
export const ProfessionalLicenseRepositoryModule = RepositoryModule.forFeature(
  {
    imports: [
      MongooseModule.forFeature(
        [
          {
            name: ProfessionalLicenseEntity.name,
            schema: ProfessionalLicenseSchema,
          },
        ],
        MONGO_MAIN_CONNECTION,
      ),
      ChangeHistoryModule,
    ],
    repositories: [
      {
        provide: REPOSITORY_PROFESSIONAL_LICENSE,
        useClass: ProfessionalLicenseRepositoryMongo,
      },
    ],
  },
)
