import { RedisStock } from '@configuration/redis'
import { GatewayInventoryMaterialRequisitionModule } from '@gateway_inventory/material_requisition/material.requisition.module'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  PurchaseRequisition,
  PurchaseRequisitionSchema,
} from '@schemas/procurement/purchase.requisition'
import { MongoMiddlewarePurchaseRequisition } from '@schemas/procurement/purchase.requisition.middleware'
import { AuthModule } from '@security/auth.module'

import { GatewayProcurementPurchaseRequisitionController } from './purchase.requisition.controller'
import { GatewayProcurementPurchaseRequisitionService } from './purchase.requisition.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: PurchaseRequisition.name, schema: PurchaseRequisitionSchema },
      ],
      'primary'
    ),
    GatewayInventoryMaterialRequisitionModule,
    BullModule.registerQueueAsync(RedisStock),
    AuthModule,
  ],
  controllers: [GatewayProcurementPurchaseRequisitionController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewarePurchaseRequisition,
    GatewayProcurementPurchaseRequisitionService,
  ],
  exports: [GatewayProcurementPurchaseRequisitionService],
})
export class GatewayProcurementPurchaseRequisitionModule {}
