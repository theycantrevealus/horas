import { ConfigModule, ConfigService } from '@nestjs/config'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { TimeManagement } from '@utility/time'

export const AccountModelProvider = {
  name: Account.name,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const schema = AccountSchema
    const time = new TimeManagement()
    schema.pre('save', function (next) {
      if (this.isNew) {
        this.id = `account-${this._id}`
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
