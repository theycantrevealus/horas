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
import { Job } from 'bullmq'
import { CompressionTypes } from 'kafkajs'

@Processor('stock')
export class StockProcessorConsumer {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    job.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data, null, 2)}...`
    )
  }

  @OnQueueError()
  onError(error: Error) {
    throw error
  }

  @OnQueuePaused()
  onPaused() {
    // job.log('Job paused?');
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    // job.progress(100)
    job.log(`Job finished with result: ${result}`)
  }

  @Process('adjustment-manual')
  async process(job: Job) {
    const transaction = await this.clientStock.transaction('grn')
    const data = job.data.payload
    const account = data.account
    const token = data.token
    try {
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
}
