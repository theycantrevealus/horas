import { ConfigModule, ConfigService } from '@nestjs/config'
import { Authority, AuthoritySchema } from '@schemas/account/authority.model'
import { TimeManagement } from '@utility/time'

export const AuthorityModelProvider = {
  name: Authority.name,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const schema = AuthoritySchema
    const time = new TimeManagement()
    schema.pre('save', function (next) {
      if (this.isNew) {
        this.id = `authority-${this._id}`
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
