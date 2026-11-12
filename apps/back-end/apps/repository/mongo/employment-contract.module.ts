import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_EMPLOYMENT_CONTRACT } from '@repository/token'
import { EmploymentContractRepositoryMongo } from './employment-contract'
import {
  EmploymentContractEntity,
  EmploymentContractSchema,
} from './schema/employment-contract'

/**
 * Registers the employment contract repository under `REPOSITORY_EMPLOYMENT_CONTRACT`.
 */
export const EmploymentContractRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: EmploymentContractEntity.name,
          schema: EmploymentContractSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_EMPLOYMENT_CONTRACT,
      useClass: EmploymentContractRepositoryMongo,
    },
  ],
})
