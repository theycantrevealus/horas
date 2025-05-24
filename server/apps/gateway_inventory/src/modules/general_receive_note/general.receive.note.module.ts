import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import { GatewayProcurementPurchaseOrderModule } from '@gateway_procurement/purchase_order/purchase.order.module'
import { GatewayProcurementPurchaseOrderService } from '@gateway_procurement/purchase_order/purchase.order.service'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteSchema,
} from '@schemas/inventory/general.receive.note'
import { MongoMiddlewareGeneralReceiveNote } from '@schemas/inventory/general.receive.note.middleware'
import { MasterItem, MasterItemSchema } from '@schemas/master/master.item'
import {
  MasterItemBatch,
  MasterItemBatchSchema,
} from '@schemas/master/master.item.batch'
import {
  MasterItemSupplier,
  MasterItemSupplierSchema,
} from '@schemas/master/master.item.supplier'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@schemas/procurement/purchase.order'
import {
  PurchaseRequisition,
  PurchaseRequisitionSchema,
} from '@schemas/procurement/purchase.requisition'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryGeneralReceiveNoteController } from './general.receive.note.controller'
import { GatewayInventoryGeneralReceiveNoteService } from './general.receive.note.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: MasterStockPoint.name, schema: MasterStockPointSchema },
        { name: MasterItem.name, schema: MasterItemSchema },
        { name: MasterItemBatch.name, schema: MasterItemBatchSchema },
        { name: GeneralReceiveNote.name, schema: GeneralReceiveNoteSchema },
        { name: MasterStockPoint.name, schema: MasterStockPointSchema },
        { name: MasterItemSupplier.name, schema: MasterItemSupplierSchema },
        { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
        { name: PurchaseRequisition.name, schema: PurchaseRequisitionSchema },
      ],
      'primary'
    ),
    AuthModule,
    GatewayProcurementPurchaseOrderModule,
  ],
  controllers: [GatewayInventoryGeneralReceiveNoteController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareGeneralReceiveNote,
    GatewayProcurementPurchaseOrderService,
    GatewayInventoryGeneralReceiveNoteService,
    MasterStockPointService,
  ],
  exports: [GatewayInventoryGeneralReceiveNoteService],
})
export class GatewayInventoryGeneralReceiveNoteModule {}
