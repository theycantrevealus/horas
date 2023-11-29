import { PurchaseOrderService } from '@inventory/purchase.order.service'
import { Controller, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Payload } from '@nestjs/microservices'
import { ApiTags } from '@nestjs/swagger'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { KafkaTopic } from '@utility/decorator'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller('inventory')
@ApiTags('Purchase Order')
export class PurchaseOrderController {
  constructor(
    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    //
  }

  @KafkaTopic('KAFKA_TOPICS')
  async purchase_order(@Payload() payload) {
    switch (payload.action) {
      case 'add':
        await this.purchaseOrderService
          .add(payload.id, payload.data, payload.account)
          .then(async (response) => {
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                response.message = 'New purchase order created'
                await clientSet
                  .emit('proceed', {
                    sender: payload.account,
                    receiver: null,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn('Failed to connect')
              })
          })
        break
      case 'edit':
        await this.purchaseOrderService
          .edit(payload.data, payload.id, payload.account)
          .then(async (response) => {
            response.message = 'Purchase order edited'
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                await clientSet
                  .emit('proceed', {
                    sender: payload.account,
                    receiver: null,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn('Failed to connect')
              })
          })
        break
      case 'delete':
        await this.purchaseOrderService
          .delete(payload.id)
          .then(async (response) => {
            response.message = 'Purchase order deleted'
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                await clientSet
                  .emit('proceed', {
                    sender: payload.account,
                    receiver: null,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn('Failed to connect')
              })
          })
        break
      case 'ask_approval':
        await this.purchaseOrderService
          .askApproval(payload.data, payload.id, payload.account)
          .then(async (response) => {
            response.message = 'Purchase order need to review'
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                await clientSet
                  .emit('proceed', {
                    sender: payload.account,
                    receiver: null,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn(e.message)
              })
          })
        break
      case 'approve':
        await this.purchaseOrderService
          .approve(payload.data, payload.id, payload.account)
          .then(async (response) => {
            response.message = 'Purchase order approved'
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                await clientSet
                  .emit('proceed', {
                    sender: payload.account,
                    receiver: payload.created_by,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn(e.message)
              })
          })
        break
      case 'decline':
        await this.purchaseOrderService
          .decline(payload.data, payload.id, payload.account)
          .then(async (response) => {
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                response.message = 'Purchase order declined'
                await clientSet
                  .emit('proceed', {
                    sender: payload.account,
                    receiver: payload.created_by,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn(e.message)
              })
          })
        break
      default:
        this.logger.error(`Unknown message payload received: ${payload}`)
    }
  }
}
