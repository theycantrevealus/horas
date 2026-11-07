import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { GatewayBackOfficeController } from './gateway.back.office.controller'
import { GatewayBackOfficeService } from './gateway.back.office.service'
import { environmentIdentifier } from '@utility/environment'
import { ApplicationConfig } from '@configuration/application'
import { MongoConfig } from '@configuration/mongo'
import { LoggerConfig } from '@configuration/logger'
import { ChangeLogConfig } from '@configuration/change-log'
import { ConfigSchema } from '@configuration/index'
import { MongoMainConnectionModule } from '@utility/database/mongo'
import { LoggerModule } from '@utility/logger/module'
import { RequestLoggingInterceptor } from '@utility/logger/interceptor'
import { LovRepositoryModule } from '@repository/mongo/lov.module'
import { RepositoryExceptionFilter } from '@utility/filter/repository'

/**
 * Root module of the API gateway application.
 * It loads configuration, sets up logging, opens the main Mongo connection, imports the
 * repositories, maps repository errors to HTTP responses and logs every request with a correlation identifier.
 * `LovRepositoryModule` should move into the feature module that uses LOV once one exists.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `${environmentIdentifier}/application.env`,
        `${environmentIdentifier}/mongo.env`,
        `${environmentIdentifier}/logger.env`,
        `${environmentIdentifier}/change-log.env`,
      ],
      load: [ApplicationConfig, MongoConfig, LoggerConfig, ChangeLogConfig],
      validationSchema: ConfigSchema,
    }),
    LoggerModule,
    MongoMainConnectionModule,
    LovRepositoryModule,
  ],
  controllers: [GatewayBackOfficeController],
  providers: [
    GatewayBackOfficeService,
    { provide: APP_FILTER, useClass: RepositoryExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class GatewayBackOfficeModule {}
