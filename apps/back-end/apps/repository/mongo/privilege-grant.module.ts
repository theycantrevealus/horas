import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_PRIVILEGE_GRANT } from '@repository/token'
import { PrivilegeGrantRepositoryMongo } from './privilege-grant'
import { PrivilegeGrantEntity, PrivilegeGrantSchema } from './schema/privilege-grant'

/**
 * Registers the a privilege grant repository under `REPOSITORY_PRIVILEGE_GRANT`.
 */
export const PrivilegeGrantRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: PrivilegeGrantEntity.name, schema: PrivilegeGrantSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_PRIVILEGE_GRANT, useClass: PrivilegeGrantRepositoryMongo },
  ],
})
