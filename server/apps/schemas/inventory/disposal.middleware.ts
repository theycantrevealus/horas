import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongoMiddleware, MongoSubscriber } from '@schemas/subscriber'
import { TimeManagement } from '@utility/time'

import { StockDisposal, StockDisposalSchema } from './disposal'

@Injectable()
@MongoSubscriber({
  name: StockDisposal.name,
  schema: StockDisposalSchema,
})
export class MongoMiddlewareStockDisposal {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  @MongoMiddleware('pre', 'findOneAndUpdate')
  async beforeUpdate(message: any) {
    const time = new TimeManagement()
    const update = message.getUpdate()
    update['updated_at'] = time.getTimezone(
      this.configService.get<string>('application.timezone')
    )
    update['$inc'] = { __v: 1 }
  }

  @MongoMiddleware('pre', 'save')
  async beforeSave(message: any) {
    const time = new TimeManagement()
    if (message.isNew) {
      message.id = `stock_disposal-${message._id}`
      // Code generator
      message.__v = 0
    }

    if (message.isModified()) {
      message.increment()
      message.updated_at = time.getTimezone(
        this.configService.get<string>('application.timezone')
      )
    }
  }
}
