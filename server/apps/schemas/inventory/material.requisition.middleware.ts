import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongoMiddleware, MongoSubscriber } from '@schemas/subscriber'
import { TimeManagement } from '@utility/time'

import {
  MaterialRequisition,
  MaterialRequisitionSchema,
} from './material.requisition'

@Injectable()
@MongoSubscriber({
  name: MaterialRequisition.name,
  schema: MaterialRequisitionSchema,
})
export class MongoMiddlewareMaterialRequisition {
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
      message.id = `material_requisition-${message._id}`
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
