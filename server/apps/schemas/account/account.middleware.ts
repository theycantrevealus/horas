import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { MongoMiddleware, MongoSubscriber } from '@schemas/subscriber'
import { TimeManagement } from '@utility/time'

@Injectable()
@MongoSubscriber({ name: Account.name, schema: AccountSchema })
export class MongoMiddlewareAccount {
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
      message.id = `account-${message._id}`
      message.__v = 0
      // // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // const { _id, ...dataSave } = message
      // message.history = [
      //   {
      //     account: message.created_by,
      //     loggedAt: message.created_at,
      //     oldValue: {},
      //     newValue: dataSave,
      //     version: message.__v,
      //   } satisfies IDocumentHistory,
      // ]
    }

    if (message.isModified()) {
      message.increment()
      message.updated_at = time.getTimezone(
        this.configService.get<string>('application.timezone')
      )
    }
  }
}
