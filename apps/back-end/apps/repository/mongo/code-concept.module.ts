import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_CODE_CONCEPT } from '@repository/token'
import { CodeConceptRepositoryMongo } from './code-concept'
import { CodeConceptEntity, CodeConceptSchema } from './schema/code-concept'

/**
 * Registers the code concept repository under `REPOSITORY_CODE_CONCEPT`.
 */
export const CodeConceptRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: CodeConceptEntity.name, schema: CodeConceptSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_CODE_CONCEPT,
      useClass: CodeConceptRepositoryMongo,
    },
  ],
})
