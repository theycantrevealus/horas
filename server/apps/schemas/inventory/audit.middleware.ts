import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongoMiddleware, MongoSubscriber } from '@schemas/subscriber'
import { TimeManagement } from '@utility/time'

import { StockAudit, StockAuditSchema } from './audit'

@Injectable()
@MongoSubscriber({
  name: StockAudit.name,
  schema: StockAuditSchema,
})
export class MongoMiddlewareStockAudit {
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
      message.id = `stock_audit-${message._id}`
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
