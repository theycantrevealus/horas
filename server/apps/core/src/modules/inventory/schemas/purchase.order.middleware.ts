import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@inventory/schemas/purchase.order'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongoMiddleware, MongoSubscriber } from '@schemas/subscriber'
import { IDocumentHistory } from '@utility/schemas/document_history'
import { TimeManagement } from '@utility/time'

@Injectable()
@MongoSubscriber({ name: PurchaseOrder.name, schema: PurchaseOrderSchema })
export class MongoMiddlewarePurchaseOrder {
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
      message.id = `purchase_order-${message._id}`
      message.__v = 0
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...dataSave } = message
      message.history = [
        {
          account: message.created_by,
          loggedAt: message.created_at,
          oldValue: {},
          newValue: dataSave,
          version: message.__v,
        } satisfies IDocumentHistory,
      ]
    }

    if (message.isModified()) {
      message.increment()
      message.updated_at = time.getTimezone(
        this.configService.get<string>('application.timezone')
      )
    }
  }
}
