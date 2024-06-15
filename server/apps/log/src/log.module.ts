import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { environmentIdentifier } from '@utility/environtment'

import { LogController } from './log.controller'
import { LogService } from './log.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.primary.uri'),
        dbName: configService.get<string>('mongo.primary.db_name'),
        user: configService.get<string>('mongo.primary.db_user'),
        pass: configService.get<string>('mongo.primary.db_password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.secondary.uri'),
        dbName: configService.get<string>('mongo.secondary.db_name'),
        user: configService.get<string>('mongo.secondary.db_user'),
        pass: configService.get<string>('mongo.secondary.db_password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
  ],
  controllers: [LogController],
  providers: [LogService],
})
export class LogModule {}
