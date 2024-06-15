import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Controller,
  Inject,
  OnModuleInit,
  UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Payload } from '@nestjs/microservices'
import { ApiTags } from '@nestjs/swagger'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { KafkaTopic } from '@utility/decorator'
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'

import { PurchaseOrderService } from './purchase.order.service'

@Controller('inventory')
@ApiTags('Purchase Order')
export class PurchaseOrderController implements OnModuleInit {
  constructor(
    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService,

    @Inject('INVENTORY_SERVICE') private client: KafkaService,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  onModuleInit(): void {
    this.client.subscribeToResponseOf(
      this.configService.get<string>('kafka.inventory.topic.purchase_order'),
      this
    )
  }

  @KafkaTopic('KAFKA_TOPICS')
  @UseInterceptors(LoggingInterceptor)
  async purchase_order(
    @Payload() payload,
    key: KafkaGlobalKey,
    // offset: string,
    // timestamp: string,
    // partition: number,
    headers: any
    // consumer: Consumer
  ) {
    // console.clear()
    // console.log(`Key       : ${JSON.stringify(key, null, 2)}`)
    // console.log(`Offset    : ${offset}`)
    // console.log(`Timestamp : ${timestamp}`)
    // console.log(`Partition : ${partition}`)
    // console.log(`Payload   : ${JSON.stringify(payload, null, 2)}`)
    // console.log(`Header    : ${JSON.stringify(headers, null, 2)}`)

    try {
      const account: IAccountCreatedBy = headers
      if (key.method) {
        if (key.method === 'create') {
          await this.purchaseOrderService
            .add(key.id, payload, account)
            .then(async (response) => {
              // await consumer.commitOffsets([
              //   {
              //     topic: 'purchase_order',
              //     partition: partition,
              //     offset: offset,
              //   },
              // ])
              await this.socketProxy
                .reconnect({
                  extraHeaders: {
                    Authorization: `Bearer ${headers.token}`,
                  },
                })
                .then(async (clientSet: Socket) => {
                  // response.message = 'New purchase order created'
                  clientSet.emit('proceed', {
                    sender: payload.account,
                    receiver: null,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  // await clientSet.disconnect()
                })
                .catch((e: Error) => {
                  this.logger.error(`Failed to connect: ${e}]`)
                })
            })
            .catch((e: Error) => {
              this.logger.error(`Error create purchase order ${e}`)
            })
        } else {
          console.error(`Error : ${key.method}`)
          // this.logger.warn('Unknown request action')
        }
      }
    } catch (errorProcess) {
      console.log(errorProcess)
      // this.logger.error('Error create purchase order', errorProcess)
    }
  }

  // @KafkaTopic('KAFKA_TOPICS')
  // async purchase_order(@Payload() payload) {
  //   switch (payload.action) {
  //     case 'add':
  //       await this.purchaseOrderService
  //         .add(payload.id, payload.data, payload.account)
  //         .then(async (response) => {
  //           await this.socketProxy
  //             .reconnect({
  //               extraHeaders: {
  //                 Authorization: payload.token,
  //               },
  //             })
  //             .then(async (clientSet) => {
  //               response.message = 'New purchase order created'
  //               await clientSet
  //                 .emit('proceed', {
  //                   sender: payload.account,
  //                   receiver: null,
  //                   payload: response,
  //                 } satisfies ProceedDataTrafficDTO)
  //                 .then(() => {
  //                   clientSet.disconnect()
  //                 })
  //             })
  //             .catch((e: Error) => {
  //               this.logger.warn('Failed to connect: ', e.message)
  //             })
  //         })
  //       break
  //     case 'edit':
  //       await this.purchaseOrderService
  //         .edit(payload.data, payload.id, payload.account)
  //         .then(async (response) => {
  //           response.message = 'Purchase order edited'
  //           await this.socketProxy
  //             .reconnect({
  //               extraHeaders: {
  //                 Authorization: payload.token,
  //               },
  //             })
  //             .then(async (clientSet) => {
  //               await clientSet
  //                 .emit('proceed', {
  //                   sender: payload.account,
  //                   receiver: null,
  //                   payload: response,
  //                 } satisfies ProceedDataTrafficDTO)
  //                 .then(() => {
  //                   clientSet.disconnect()
  //                 })
  //             })
  //             .catch((e: Error) => {
  //               this.logger.warn('Failed to connect: ', e.message)
  //             })
  //         })
  //       break
  //     case 'delete':
  //       await this.purchaseOrderService
  //         .delete(payload.id)
  //         .then(async (response) => {
  //           response.message = 'Purchase order deleted'
  //           await this.socketProxy
  //             .reconnect({
  //               extraHeaders: {
  //                 Authorization: payload.token,
  //               },
  //             })
  //             .then(async (clientSet) => {
  //               await clientSet
  //                 .emit('proceed', {
  //                   sender: payload.account,
  //                   receiver: null,
  //                   payload: response,
  //                 } satisfies ProceedDataTrafficDTO)
  //                 .then(() => {
  //                   clientSet.disconnect()
  //                 })
  //             })
  //             .catch((e: Error) => {
  //               this.logger.warn('Failed to connect: ', e.message)
  //             })
  //         })
  //       break
  //     case 'ask_approval':
  //       await this.purchaseOrderService
  //         .askApproval(payload.data, payload.id, payload.account)
  //         .then(async (response) => {
  //           response.message = 'Purchase order need to review'
  //           await this.socketProxy
  //             .reconnect({
  //               extraHeaders: {
  //                 Authorization: payload.token,
  //               },
  //             })
  //             .then(async (clientSet) => {
  //               await clientSet
  //                 .emit('proceed', {
  //                   sender: payload.account,
  //                   receiver: null,
  //                   payload: response,
  //                 } satisfies ProceedDataTrafficDTO)
  //                 .then(() => {
  //                   clientSet.disconnect()
  //                 })
  //             })
  //             .catch((e: Error) => {
  //               this.logger.warn(e.message)
  //             })
  //         })
  //       break
  //     case 'approve':
  //       await this.purchaseOrderService
  //         .approve(payload.data, payload.id, payload.account)
  //         .then(async (response) => {
  //           response.message = 'Purchase order approved'
  //           await this.socketProxy
  //             .reconnect({
  //               extraHeaders: {
  //                 Authorization: payload.token,
  //               },
  //             })
  //             .then(async (clientSet) => {
  //               await clientSet
  //                 .emit('proceed', {
  //                   sender: payload.account,
  //                   receiver: payload.created_by,
  //                   payload: response,
  //                 } satisfies ProceedDataTrafficDTO)
  //                 .then(() => {
  //                   clientSet.disconnect()
  //                 })
  //             })
  //             .catch((e: Error) => {
  //               this.logger.warn(e.message)
  //             })
  //         })
  //       break
  //     case 'decline':
  //       await this.purchaseOrderService
  //         .decline(payload.data, payload.id, payload.account)
  //         .then(async (response) => {
  //           await this.socketProxy
  //             .reconnect({
  //               extraHeaders: {
  //                 Authorization: payload.token,
  //               },
  //             })
  //             .then(async (clientSet) => {
  //               response.message = 'Purchase order declined'
  //               await clientSet
  //                 .emit('proceed', {
  //                   sender: payload.account,
  //                   receiver: payload.created_by,
  //                   payload: response,
  //                 } satisfies ProceedDataTrafficDTO)
  //                 .then(() => {
  //                   clientSet.disconnect()
  //                 })
  //             })
  //             .catch((e: Error) => {
  //               this.logger.warn(e.message)
  //             })
  //         })
  //       break
  //     default:
  //       this.logger.error(`Unknown message payload received: ${payload}`)
  //   }
  // }
}
