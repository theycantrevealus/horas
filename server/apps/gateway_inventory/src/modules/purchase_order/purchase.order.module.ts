import { PurchaseOrderController } from '@gateway_inventory/purchase_order/purchase.order.controller'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@schemas/inventory/purchase.order'
import { MongoMiddlewarePurchaseOrder } from '@schemas/inventory/purchase.order.middleware'
import { AuthModule } from '@security/auth.module'

import { PurchaseOrderService } from './purchase.order.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [PurchaseOrderController],
  providers: [MongoMiddlewarePurchaseOrder, PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
