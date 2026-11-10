import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ORGANIZATION } from '@repository/token'
import { OrganizationRepositoryMongo } from './organization'
import { OrganizationEntity, OrganizationSchema } from './schema/organization'

/**
 * Registers the organization repository under `REPOSITORY_ORGANIZATION`.
 */
export const OrganizationRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: OrganizationEntity.name, schema: OrganizationSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_ORGANIZATION,
      useClass: OrganizationRepositoryMongo,
    },
  ],
})
