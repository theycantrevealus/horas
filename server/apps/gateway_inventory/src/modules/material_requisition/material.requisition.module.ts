import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  MaterialRequisition,
  MaterialRequisitionSchema,
} from '@schemas/inventory/material.requisition'
import { MongoMiddlewareMaterialRequisition } from '@schemas/inventory/material.requisition.middleware'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryMaterialRequisitionController } from './material.requisition.controller'
import { GatewayInventoryMaterialRequisitionService } from './material.requisition.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: MaterialRequisition.name, schema: MaterialRequisitionSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [GatewayInventoryMaterialRequisitionController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareMaterialRequisition,
    GatewayInventoryMaterialRequisitionService,
  ],
  exports: [GatewayInventoryMaterialRequisitionService],
})
export class GatewayInventoryMaterialRequisitionModule {}
