import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_LEAVE_POLICY } from '@repository/token'
import { LeavePolicyRepositoryMongo } from './leave-policy'
import { LeavePolicyEntity, LeavePolicySchema } from './schema/leave-policy'

/**
 * Registers the leave policy repository under `REPOSITORY_LEAVE_POLICY`.
 */
export const LeavePolicyRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: LeavePolicyEntity.name, schema: LeavePolicySchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_LEAVE_POLICY, useClass: LeavePolicyRepositoryMongo },
  ],
})
