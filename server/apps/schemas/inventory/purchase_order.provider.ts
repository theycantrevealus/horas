import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@schemas/inventory/purchase.order'
import { TimeManagement } from '@utility/time'

export const PuchaseOrderModelProvider = {
  name: PurchaseOrder.name,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const schema = PurchaseOrderSchema
    const time = new TimeManagement()

    schema.pre('save', function (next) {
      if (this.isNew) {
        this.id = `purchase_order-${this._id}`
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
