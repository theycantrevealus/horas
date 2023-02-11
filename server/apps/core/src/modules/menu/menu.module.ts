import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { AccountService } from '@core/account/account.service'
import {
  AccountModel,
  AccountSchema,
} from '@core/account/schemas/account.model'
import { MenuGroupController } from '@core/menu/menu.group.controller'
import { MenuGroupService } from '@core/menu/menu.group.service'
import {
  MenuGroupModel,
  MenuGroupSchema,
} from '@core/menu/schemas/menu.group.model'
import { MenuModel, MenuSchema } from '@core/menu/schemas/menu.model'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/environment/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [ApplicationConfig, MongoConfig],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: MenuGroupModel.name,
        useFactory: () => {
          const schema = MenuGroupSchema
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
      { name: AccountModel.name, schema: AccountSchema },
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },

      { name: MenuModel.name, schema: MenuSchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [MenuGroupController],
  providers: [MenuGroupService, AccountService],
})
export class MenuModule {}
