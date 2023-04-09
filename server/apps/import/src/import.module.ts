import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { LOVModule } from '@core/lov/lov.module'
import { MasterModule } from '@core/master/master.module'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'

import { ImportController } from './import.controller'
import { ImportService } from './import.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/environment/${
        process.env.NODE_ENV === '' ? '' : process.env.NODE_ENV
      }.env`,
      load: [ApplicationConfig, MongoConfig, KafkaConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db_name'),
        user: configService.get<string>('mongo.db_user'),
        pass: configService.get<string>('mongo.db_password'),
      }),
      inject: [ConfigService],
    }),
    MasterModule,
    LOVModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
