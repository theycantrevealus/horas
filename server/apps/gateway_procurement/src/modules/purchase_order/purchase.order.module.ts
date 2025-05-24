import { GatewayProcurementPurchaseOrderController } from '@gateway_procurement/purchase_order/purchase.order.controller'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  MasterItemSupplier,
  MasterItemSupplierSchema,
} from '@schemas/master/master.item.supplier'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@schemas/procurement/purchase.order'
import { MongoMiddlewarePurchaseOrder } from '@schemas/procurement/purchase.order.middleware'
import {
  PurchaseRequisition,
  PurchaseRequisitionSchema,
} from '@schemas/procurement/purchase.requisition'
import { AuthModule } from '@security/auth.module'

import { GatewayProcurementPurchaseOrderService } from './purchase.order.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: MasterItemSupplier.name, schema: MasterItemSupplierSchema },
        { name: PurchaseRequisition.name, schema: PurchaseRequisitionSchema },
        { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [GatewayProcurementPurchaseOrderController],
  providers: [
    MongoMiddlewarePurchaseOrder,
    GatewayProcurementPurchaseOrderService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
  ],
  exports: [GatewayProcurementPurchaseOrderService],
})
export class GatewayProcurementPurchaseOrderModule {}
