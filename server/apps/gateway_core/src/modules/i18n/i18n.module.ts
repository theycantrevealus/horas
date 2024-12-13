import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@gateway_core/account/account.module'
import { I18nController } from '@gateway_core/i18n/i18n.controller'
import { I18nService } from '@gateway_core/i18n/i18n.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { i18n, i18nSchema } from '@schemas/i18n/i18n'
import { MongoMiddlewarei18n } from '@schemas/i18n/i18n.middleware'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier } from '@utility/environtment'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig],
    }),
    MongooseModule.forFeature(
      [
        { name: i18n.name, schema: i18nSchema },
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
    AccountModule,
  ],
  controllers: [I18nController],
  providers: [I18nService, MongoMiddlewarei18n],
})
export class I18nModule {}
