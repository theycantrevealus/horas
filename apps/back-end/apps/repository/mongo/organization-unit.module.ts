import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ORGANIZATION_UNIT } from '@repository/token'
import { OrganizationUnitRepositoryMongo } from './organization-unit'
import {
  OrganizationUnitEntity,
  OrganizationUnitSchema,
} from './schema/organization-unit'

/**
 * Registers the organization unit repository under `REPOSITORY_ORGANIZATION_UNIT`.
 */
export const OrganizationUnitRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: OrganizationUnitEntity.name, schema: OrganizationUnitSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_ORGANIZATION_UNIT,
      useClass: OrganizationUnitRepositoryMongo,
    },
  ],
})
