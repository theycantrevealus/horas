import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { StockDisposal, StockDisposalSchema } from '@schemas/inventory/disposal'
import { MongoMiddlewareStockDisposal } from '@schemas/inventory/disposal.middleware'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryStockDisposalController } from './gateway.inventory.disposal.controller'
import { GatewayInventoryStockDisposalService } from './gateway.inventory.disposal.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: StockDisposal.name, schema: StockDisposalSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [GatewayInventoryStockDisposalController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareStockDisposal,
    GatewayInventoryStockDisposalService,
  ],
  exports: [GatewayInventoryStockDisposalService],
})
export class GatewayInventoryStockDisposalModule {}
