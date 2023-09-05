import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { AccountService } from '@core/account/account.service'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import {
  Authority,
  AuthoritySchema,
} from '@core/account/schemas/authority.model'
import { MenuController } from '@core/menu/menu.controller'
import { MenuGroupController } from '@core/menu/menu.group.controller'
import { MenuGroupService } from '@core/menu/menu.group.service'
import { MenuService } from '@core/menu/menu.service'
import { MenuGroup, MenuGroupSchema } from '@core/menu/schemas/menu.group.model'
import { Menu, MenuSchema } from '@core/menu/schemas/menu.model'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier } from '@utility/environtment'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: MenuGroup.name,
        useFactory: () => {
          const schema = MenuGroupSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `menu_group-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              // this.increment()
              this.increment()
              this.id = `menu_group-${this._id}`
              this.updated_at = time.getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate()
            update['updated_at'] = time.getTimezone('Asia/Jakarta')
            update['$inc'] = { __v: 1 }
            next()
          })

          return schema
        },
      },
      {
        name: Menu.name,
        useFactory: () => {
          const schema = MenuSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `menu-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              // this.increment()
              this.increment()
              this.id = `menu-${this._id}`
              this.updated_at = time.getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate()
            update['updated_at'] = time.getTimezone('Asia/Jakarta')
            update['$inc'] = { __v: 1 }
            next()
          })

          return schema
        },
      },
    ]),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Authority.name, schema: AuthoritySchema },
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [MenuGroupController, MenuController],
  providers: [MenuGroupService, AccountService, MenuService],
  exports: [MenuGroupService, MenuService],
})
export class MenuModule {}
