import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { InventoryModule } from '@core/inventory/inventory.module'
import { LOVModule } from '@core/lov/lov.module'
import { MasterModule } from '@core/master/master.module'
import { MenuModule } from '@core/menu/menu.module'
import { PatientModule } from '@core/patient/patient.module'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'

import { CoreController } from './core.controller'
import { CoreService } from './core.service'

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
    AuthModule,
    AccountModule,
    LOVModule,
    PatientModule,
    MenuModule,
    MasterModule,
    InventoryModule,
  ],
  controllers: [CoreController],
  providers: [CoreService],
})
export class CoreModule {}
