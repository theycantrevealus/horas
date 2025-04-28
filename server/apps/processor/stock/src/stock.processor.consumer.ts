import { GatewayInventoryStockDisposalService } from '@gateway_inventory/disposal/gateway.inventory.disposal.service'
import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueError,
  OnQueuePaused,
  Process,
  Processor,
} from '@nestjs/bull'
import { Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Job } from 'bullmq'
import { CompressionTypes } from 'kafkajs'
import { Logger } from 'winston'

@Processor('stock')
export class StockProcessorConsumer {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(GatewayInventoryStockDisposalService)
    private readonly gatewayInventoryStockDisposalService: GatewayInventoryStockDisposalService,

    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @OnQueueError()
  onError(error: Error) {
    this.logger.error(error.message)
  }

  @OnQueueActive()
  async onActive(job: Job) {
    const logData = `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data, null, 2)}...`
    job.log(logData)
    this.logger.verbose(logData)
  }

  @OnQueuePaused()
  async onPaused(job: Job) {
    const logData = `Paused job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data, null, 2)}...`
    job.log(logData)
    this.logger.verbose(logData)
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    const logData = `Finished job ${job.id} with result: ${result}`
    job.log(logData)
    this.logger.verbose(logData)
  }

  @Process('adjustment-manual')
  async processAdjustment(job: Job) {
    const transaction = await this.clientStock.transaction('adjustment-manual')
    try {
      const data = job.data.payload
      const account = data.account
      const token = data.token
      const items = []

      data.detail.forEach((item) => {
        items.push({
          headers: {
            ...account,
            token: token,
          },
          key: {
            id: data.id,
            code: data.code,
            service: 'stock',
            method: 'adjustment-manual',
          },
          value: {
            batch: item.batch,
            from: {
              id: '-',
              code: '-',
              name: '-',
            },
            to: data.stock_point,
            qty: item.qty,
            balance: item.qty,
            transaction_id: data.id,
            logged_at: new Date().toString(),
          },
        })
      })

      await transaction.send({
        acks: -1,
        timeout: 5000,
        compression: CompressionTypes.None,
        topic: this.configService.get<string>('kafka.stock.topic.stock'),
        messages: items,
      })
      await transaction.commit()
    } catch (kafkaError) {
      await transaction.abort()
      throw kafkaError
    }
  }

  @Process('disposal')
  async processDisposal(job: Job) {
    const transaction = await this.clientStock.transaction('disposal')
    try {
      const data = job.data.payload
      const account = data.account
      const token = data.token
      const items = []

      data.detail.forEach((item) => {
        items.push({
          headers: {
            ...account,
            token: token,
          },
          key: {
            id: data.id,
            code: data.code,
            service: 'stock',
            method: 'disposal',
          },
          value: {
            batch: item.batch,
            from: data.stock_point,
            to: {
              id: '-',
              code: '-',
              name: '-',
            },
            qty: item.qty,
            balance: item.qty,
            transaction_id: data.id,
            logged_at: new Date().toString(),
          },
        })
      })

      await transaction.send({
        acks: -1,
        timeout: 5000,
        compression: CompressionTypes.None,
        topic: this.configService.get<string>('kafka.stock.topic.stock'),
        messages: items,
      })
      await transaction.commit()

      await this.gatewayInventoryStockDisposalService.completed(
        {
          remark: 'Completed disposal process',
          __v: data.__v,
        },
        '',
        account
      )
    } catch (kafkaError) {
      await transaction.abort()
      throw kafkaError
    }
  }

  @Process('initiation')
  async processInitiation(job: Job) {
    const transaction = await this.clientStock.transaction('initiation')
    try {
      const data = job.data.payload
      const account = data.account
      const token = data.token
      const items = []

      data.detail.forEach((item) => {
        items.push({
          headers: {
            ...account,
            token: token,
          },
          key: {
            id: data.id,
            code: data.code,
            service: 'stock',
            method: 'initiation',
          },
          value: {
            batch: item.batch,
            from: data.stock_point,
            to: {
              id: '-',
              code: '-',
              name: '-',
            },
            qty: item.qty,
            balance: item.qty,
            transaction_id: data.id,
            logged_at: new Date().toString(),
          },
        })
      })

      await transaction.send({
        acks: -1,
        timeout: 5000,
        compression: CompressionTypes.None,
        topic: this.configService.get<string>('kafka.stock.topic.stock'),
        messages: items,
      })
      await transaction.commit()

      await this.gatewayInventoryStockDisposalService.completed(
        {
          remark: 'Completed initiation process',
          __v: data.__v,
        },
        '',
        account
      )
    } catch (kafkaError) {
      await transaction.abort()
      throw kafkaError
    }
  }
}
