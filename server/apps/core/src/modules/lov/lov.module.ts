import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { LOVController } from '@core/lov/lov.controller'
import { LOVService } from '@core/lov/lov.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { LOV, LOVSchema } from '@schemas/lov/lov'
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
        { name: LOV.name, schema: LOVSchema },
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
    AccountModule,
  ],
  controllers: [LOVController],
  providers: [LOVService],
  exports: [LOVService],
})
export class LOVModule {}
