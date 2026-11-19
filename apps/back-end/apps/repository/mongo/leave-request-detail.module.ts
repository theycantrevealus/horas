import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_LEAVE_REQUEST_DETAIL } from '@repository/token'
import { LeaveRequestDetailRepositoryMongo } from './leave-request-detail'
import {
  LeaveRequestDetailEntity,
  LeaveRequestDetailSchema,
} from './schema/leave-request-detail'

/**
 * Registers the leave request detail repository under `REPOSITORY_LEAVE_REQUEST_DETAIL`.
 */
export const LeaveRequestDetailRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: LeaveRequestDetailEntity.name, schema: LeaveRequestDetailSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_LEAVE_REQUEST_DETAIL,
      useClass: LeaveRequestDetailRepositoryMongo,
    },
  ],
})
