import {
  OperationQueue,
  OperationQueueSchema,
} from '@core/operation/queue/schemas/queue'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TimeManagement } from '@utility/time'

export const OperationQueueModelProvider = {
  name: OperationQueue.name,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const schema = OperationQueueSchema
    const time = new TimeManagement()
    schema.pre('save', function (next) {
      if (this.isNew) {
        this.id = `queue-${this._id}`
        this.__v = 0
      }

      if (this.isModified()) {
        this.increment()
        this.updated_at = time.getTimezone(
          configService.get<string>('application.timezone')
        )
        return next()
      } else {
        return next(new Error('Invalid document'))
      }
    })

    schema.pre('findOneAndUpdate', function (next) {
      const update = this.getUpdate()
      update['updated_at'] = time.getTimezone(
        configService.get<string>('application.timezone')
      )
      update['$inc'] = { __v: 1 }
      return next()
    })

    return schema
  },
}
