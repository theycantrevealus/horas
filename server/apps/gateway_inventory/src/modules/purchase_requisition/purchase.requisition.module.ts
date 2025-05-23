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
} from '@schemas/inventory/purchase.requisition'
import { MongoMiddlewarePurchaseRequisition } from '@schemas/inventory/purchase.requisition.middleware'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryPurchaseRequisitionController } from './purchase.requisition.controller'
import { GatewayInventoryPurchaseRequisitionService } from './purchase.requisition.service'

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
  controllers: [GatewayInventoryPurchaseRequisitionController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewarePurchaseRequisition,
    GatewayInventoryPurchaseRequisitionService,
  ],
  exports: [GatewayInventoryPurchaseRequisitionService],
})
export class GatewayInventoryPurchaseRequisitionModule {}
