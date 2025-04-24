import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import { GatewayInventoryPurchaseOrderModule } from '@gateway_inventory/purchase_order/purchase.order.module'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteSchema,
} from '@schemas/inventory/general.receive.note'
import { MongoMiddlewareGeneralReceiveNote } from '@schemas/inventory/general.receive.note.middleware'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryGeneralReceiveNoteController } from './general.receive.note.controller'
import { GatewayInventoryGeneralReceiveNoteService } from './general.receive.note.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: GeneralReceiveNote.name, schema: GeneralReceiveNoteSchema },
        { name: MasterStockPoint.name, schema: MasterStockPointSchema },
      ],
      'primary'
    ),
    AuthModule,
    GatewayInventoryPurchaseOrderModule,
  ],
  controllers: [GatewayInventoryGeneralReceiveNoteController],
  providers: [
    MongoMiddlewareGeneralReceiveNote,
    GatewayInventoryGeneralReceiveNoteService,
    MasterStockPointService,
  ],
  exports: [GatewayInventoryGeneralReceiveNoteService],
})
export class GatewayInventoryGeneralReceiveNoteModule {}
