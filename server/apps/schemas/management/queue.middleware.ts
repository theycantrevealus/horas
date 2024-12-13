import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue, QueueSchema } from '@schemas/management/queue'
import { MongoMiddleware, MongoSubscriber } from '@schemas/subscriber'
import { pad } from '@utility/string'
import { TimeManagement } from '@utility/time'

@Injectable()
@MongoSubscriber({
  name: Queue.name,
  schema: QueueSchema,
})
export class MongoMiddlewareQueue {
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
  async beforeSave(message) {
    const time = new TimeManagement()

    if (message.isNew) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)

      const end = new Date()
      end.setHours(23, 59, 59, 999)

      await message.constructor
        .countDocuments({
          created_at: { $gte: start, $lt: end },
          'type.value': message.type.value,
        })
        .then((nextCounter) => {
          message.queue_number += parseInt(nextCounter)
          message.code = `${message.type.value}-${pad('0000', message.queue_number.toString(), true)}`
          message.id = `queue-${message._id}`
          message.__v = 0
        })
    }

    if (message.isModified()) {
      message.increment()
      message.updated_at = time.getTimezone(
        this.configService.get<string>('application.timezone')
      )
    }
  }
}
