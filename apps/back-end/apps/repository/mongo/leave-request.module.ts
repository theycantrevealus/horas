import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_LEAVE_REQUEST } from '@repository/token'
import { LeaveRequestRepositoryMongo } from './leave-request'
import { LeaveRequestEntity, LeaveRequestSchema } from './schema/leave-request'

/**
 * Registers the leave request repository under `REPOSITORY_LEAVE_REQUEST`.
 */
export const LeaveRequestRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: LeaveRequestEntity.name, schema: LeaveRequestSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_LEAVE_REQUEST, useClass: LeaveRequestRepositoryMongo },
  ],
})
