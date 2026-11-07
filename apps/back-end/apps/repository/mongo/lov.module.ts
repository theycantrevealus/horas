import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_LOV } from '@repository/token'
import { LOVRepositoryMongo } from './lov'
import { LovEntity, LovSchema } from './schema/lov'

/**
 * LOV repository on the main Mongo connection. It records every write in the change history.
 * Import it in any feature module that injects `REPOSITORY_LOV`.
 */
export const LovRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: LovEntity.name, schema: LovSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [{ provide: REPOSITORY_LOV, useClass: LOVRepositoryMongo }],
})
