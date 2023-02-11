import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { TimeManagement } from '@utility/time'

import { AccountController } from './account.controller'
import { AccountService } from './account.service'
import { AccountModel, AccountSchema } from './schemas/account.model'

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: AccountModel.name,
        useFactory: () => {
          const schema = AccountSchema
          schema.pre('save', function (next) {
            if (this.isModified()) {
              this.increment()
              this.updated_at = new TimeManagement().getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          return schema
        },
      },
    ]),
    MongooseModule.forFeature([
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
