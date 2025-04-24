import { RedisStock } from '@configuration/redis'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MongoMiddlewareStockAdjustment } from '@schemas/inventory/adjustment.middleware'
import {
  PurchaseRequisition,
  PurchaseRequisitionSchema,
} from '@schemas/inventory/purchase.requisition'
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
    BullModule.registerQueueAsync(RedisStock),
    AuthModule,
  ],
  controllers: [GatewayInventoryPurchaseRequisitionController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareStockAdjustment,
    GatewayInventoryPurchaseRequisitionService,
  ],
  exports: [GatewayInventoryPurchaseRequisitionService],
})
export class GatewayInventoryPurchaseRequisitionModule {}
