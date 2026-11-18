import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_SHIFT_SWAP_REQUEST } from '@repository/token'
import { ShiftSwapRequestRepositoryMongo } from './shift-swap-request'
import {
  ShiftSwapRequestEntity,
  ShiftSwapRequestSchema,
} from './schema/shift-swap-request'

/**
 * Registers the shift swap request repository under `REPOSITORY_SHIFT_SWAP_REQUEST`.
 */
export const ShiftSwapRequestRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: ShiftSwapRequestEntity.name,
          schema: ShiftSwapRequestSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_SHIFT_SWAP_REQUEST,
      useClass: ShiftSwapRequestRepositoryMongo,
    },
  ],
})
