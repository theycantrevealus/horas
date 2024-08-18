import { PurchaseOrderModule } from '@gateway_inventory/purchase_order/purchase.order.module'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteSchema,
} from '@schemas/inventory/general.receive.note'
import { MongoMiddlewareGeneralReceiveNote } from '@schemas/inventory/general.receive.note.middleware'
import { AuthModule } from '@security/auth.module'

import { GeneralReceiveNoteController } from './general.receive.note.controller'
import { GeneralReceiveNoteService } from './general.receive.note.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: GeneralReceiveNote.name, schema: GeneralReceiveNoteSchema },
      ],
      'primary'
    ),
    AuthModule,
    PurchaseOrderModule,
  ],
  controllers: [GeneralReceiveNoteController],
  providers: [MongoMiddlewareGeneralReceiveNote, GeneralReceiveNoteService],
  exports: [GeneralReceiveNoteService],
})
export class GeneralReceiveNoteModule {}
