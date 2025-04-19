import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { StockAudit, StockAuditSchema } from '@schemas/inventory/audit'
import { MongoMiddlewareStockAudit } from '@schemas/inventory/audit.middleware'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryStockAuditController } from './gateway.inventory.audit.controller'
import { GatewayInventoryStockAuditService } from './gateway.inventory.audit.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: StockAudit.name, schema: StockAuditSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [GatewayInventoryStockAuditController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareStockAudit,
    GatewayInventoryStockAuditService,
  ],
  exports: [GatewayInventoryStockAuditService],
})
export class GatewayInventoryStockAuditModule {}
