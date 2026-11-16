import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_COVERAGE_REQUIREMENT } from '@repository/token'
import { CoverageRequirementRepositoryMongo } from './coverage-requirement'
import {
  CoverageRequirementEntity,
  CoverageRequirementSchema,
} from './schema/coverage-requirement'

/**
 * Registers the coverage requirement repository under `REPOSITORY_COVERAGE_REQUIREMENT`.
 */
export const CoverageRequirementRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: CoverageRequirementEntity.name,
          schema: CoverageRequirementSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_COVERAGE_REQUIREMENT,
      useClass: CoverageRequirementRepositoryMongo,
    },
  ],
})
