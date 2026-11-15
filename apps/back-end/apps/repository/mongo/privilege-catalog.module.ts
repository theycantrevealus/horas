import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_PRIVILEGE_CATALOG } from '@repository/token'
import { PrivilegeCatalogRepositoryMongo } from './privilege-catalog'
import {
  PrivilegeCatalogEntity,
  PrivilegeCatalogSchema,
} from './schema/privilege-catalog'

/**
 * Registers the privilege catalog repository under `REPOSITORY_PRIVILEGE_CATALOG`.
 */
export const PrivilegeCatalogRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: PrivilegeCatalogEntity.name, schema: PrivilegeCatalogSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_PRIVILEGE_CATALOG,
      useClass: PrivilegeCatalogRepositoryMongo,
    },
  ],
})
