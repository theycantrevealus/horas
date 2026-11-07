import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ROLE } from '@repository/token'
import { RoleRepositoryMongo } from './role'
import { RoleEntity, RoleSchema } from './schema/role'

/**
 * Role repository on the main Mongo connection.
 * Import it in any feature module that injects `REPOSITORY_ROLE`.
 */
export const RoleRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: RoleEntity.name, schema: RoleSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [{ provide: REPOSITORY_ROLE, useClass: RoleRepositoryMongo }],
})
