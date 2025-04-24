import { GatewayInventoryPurchaseOrderController } from '@gateway_inventory/purchase_order/purchase.order.controller'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@schemas/inventory/purchase.order'
import { MongoMiddlewarePurchaseOrder } from '@schemas/inventory/purchase.order.middleware'
import {
  PurchaseRequisition,
  PurchaseRequisitionSchema,
} from '@schemas/inventory/purchase.requisition'
import {
  MasterItemSupplier,
  MasterItemSupplierSchema,
} from '@schemas/master/master.item.supplier'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryPurchaseOrderService } from './purchase.order.service'

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
  controllers: [GatewayInventoryPurchaseOrderController],
  providers: [
    MongoMiddlewarePurchaseOrder,
    GatewayInventoryPurchaseOrderService,
  ],
  exports: [GatewayInventoryPurchaseOrderService],
})
export class GatewayInventoryPurchaseOrderModule {}
