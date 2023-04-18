import { PurchaseOrderService } from '@inventory/purchase.order.service'
import { Controller, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { ApiTags } from '@nestjs/swagger'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'

@Controller('inventory')
@ApiTags('Purchase Order')
export class PurchaseOrderController {
  private readonly logger: Logger = new Logger(PurchaseOrderController.name)
  constructor(
    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService,
    //@Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  @MessagePattern('purchase_order')
  async proceed(@Payload() payload) {
    switch (payload.action) {
      case 'add':
        await this.purchaseOrderService
          .add(payload.id, payload.data, payload.account)
          .then(async (response) => {
            await this.socketProxy.connect().then(async () => {
              await this.socketProxy.emit(
                this.configService.get<string>('neural.event.proceed'),
                {
                  sender: payload.account,
                  receiver: payload.account,
                  payload: response,
                } satisfies ProceedDataTrafficDTO
              )
            })
          })
        break
      case 'edit':
        await this.purchaseOrderService
          .edit(payload.data, payload.id)
          .then(async (response) => {
            await this.socketProxy.connect().then(async () => {
              await this.socketProxy.emit(
                this.configService.get<string>('neural.event.proceed'),
                {
                  sender: payload.account,
                  receiver: payload.account,
                  payload: response,
                } satisfies ProceedDataTrafficDTO
              )
            })
          })
        break
      case 'delete':
        await this.purchaseOrderService
          .delete(payload.id)
          .then(async (response) => {
            await this.socketProxy.connect().then(async () => {
              await this.socketProxy.emit(
                this.configService.get<string>('neural.event.proceed'),
                {
                  sender: payload.account,
                  receiver: payload.account,
                  payload: response,
                } satisfies ProceedDataTrafficDTO
              )
            })
          })
        break
      case 'ask_approval':
        await this.purchaseOrderService
          .askApproval(payload.data, payload.id, payload.account)
          .then(async (response) => {
            await this.socketProxy.connect().then(async () => {
              await this.socketProxy.emit(
                this.configService.get<string>('neural.event.proceed'),
                {
                  sender: payload.account,
                  receiver: payload.account,
                  payload: response,
                } satisfies ProceedDataTrafficDTO
              )
            })
          })
        break
      case 'approve':
        await this.purchaseOrderService
          .approve(payload.data, payload.id, payload.account)
          .then(async (response) => {
            await this.socketProxy.connect().then(async () => {
              await this.socketProxy.emit(
                this.configService.get<string>('neural.event.proceed'),
                {
                  sender: payload.account,
                  receiver: payload.account,
                  payload: response,
                } satisfies ProceedDataTrafficDTO
              )
            })
          })
        break
      case 'decline':
        await this.purchaseOrderService
          .decline(payload.data, payload.id, payload.account)
          .then(async (response) => {
            await this.socketProxy.connect().then(async () => {
              await this.socketProxy.emit(
                this.configService.get<string>('neural.event.proceed'),
                {
                  sender: payload.account,
                  receiver: payload.account,
                  payload: response,
                } satisfies ProceedDataTrafficDTO
              )
            })
          })
        break
    }
  }
}
