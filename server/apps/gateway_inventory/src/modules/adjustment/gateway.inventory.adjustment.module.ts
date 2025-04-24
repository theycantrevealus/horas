import { RedisStock } from '@configuration/redis'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  StockAdjustment,
  StockAdjustmentSchema,
} from '@schemas/inventory/adjustment'
import { MongoMiddlewareStockAdjustment } from '@schemas/inventory/adjustment.middleware'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryStockAdjustmentController } from './gateway.inventory.adjustment.controller'
import { GatewayInventoryStockAdjustmentService } from './gateway.inventory.adjustment.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: StockAdjustment.name, schema: StockAdjustmentSchema },
      ],
      'primary'
    ),
    BullModule.registerQueueAsync(RedisStock),
    AuthModule,
  ],
  controllers: [GatewayInventoryStockAdjustmentController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareStockAdjustment,
    GatewayInventoryStockAdjustmentService,
  ],
  exports: [GatewayInventoryStockAdjustmentService],
})
export class GatewayInventoryStockAdjustmentModule {}
