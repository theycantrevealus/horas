import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Mutation, MutationSchema } from '@schemas/inventory/mutation'
import { MongoMiddlewareMutation } from '@schemas/inventory/mutation.middleware'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryMutationController } from './gateway.inventory.mutation.controller'
import { GatewayInventoryMutationService } from './gateway.inventory.mutation.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: Mutation.name, schema: MutationSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [GatewayInventoryMutationController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareMutation,
    GatewayInventoryMutationService,
  ],
  exports: [GatewayInventoryMutationService],
})
export class GatewayInventoryMutationModule {}
