import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_LEAVE_LEDGER } from '@repository/token'
import { LeaveLedgerRepositoryMongo } from './leave-ledger'
import {
  LeaveLedgerEntryEntity,
  LeaveLedgerEntrySchema,
} from './schema/leave-ledger'

/**
 * Registers the leave ledger repository under `REPOSITORY_LEAVE_LEDGER`.
 */
export const LeaveLedgerRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: LeaveLedgerEntryEntity.name, schema: LeaveLedgerEntrySchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_LEAVE_LEDGER,
      useClass: LeaveLedgerRepositoryMongo,
    },
  ],
})
