import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CacheModule, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import * as redisStore from 'cache-manager-ioredis'
import * as winston from 'winston'

import { AccountController } from './account.controller'
import { AccountService } from './account.service'
import { Account, AccountSchema } from './schemas/account.model'

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get<string>('redis.host'),
          port: configService.get<string>('redis.port'),
          username: configService.get<string>('redis.username'),
          password: configService.get<string>('redis.password'),
          isGlobal: true,
        }
      },
      inject: [ConfigService],
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const today = new TimeManagement()
        return {
          levels: {
            error: 0,
            warn: 1,
            verbose: 3,
          },
          transports: [
            new winston.transports.Console({
              level: 'verbose',
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                winston.format.printf((data) => {
                  return JSON.stringify({
                    timestamp: data.timestamp,
                    level: data.level,
                    message: data.message,
                  })
                })
              ),
            }),
          ],
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: Account.name,
        useFactory: () => {
          const schema = AccountSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `account-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              // this.increment()
              this.increment()
              this.id = `account-${this._id}`
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
        name: LogLogin.name,
        useFactory: () => {
          const schema = LogLoginSchema
          schema.pre('save', function (next) {
            return next()
          })

          return schema
        },
      },
      {
        name: LogLogin.name,
        useFactory: () => {
          const schema = LogLoginSchema
          schema.pre('save', function (next) {
            return next()
          })

          return schema
        },
      },
      {
        name: LogActivity.name,
        useFactory: () => {
          const schema = LogActivitySchema
          schema.pre('save', function (next) {
            return next()
          })

          return schema
        },
      },
    ]),
    AuthModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
