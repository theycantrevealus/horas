import { AccountModule } from '@core/account/account.module'
import { OperationQueueController } from '@core/operation/queue/controllers/queue.controller'
import { OperationQueueModelProvider } from '@core/operation/queue/schemas/queue.provider'
import { OperationQueueService } from '@core/operation/queue/services/operation-queue.service'
import { ClientDecoratorProcessorService } from '@decorators/kafka/client'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentName } from '@utility/environtment'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          colorize: configService.get<boolean>('application.log.colorize'),
          transports: WinstonCustomTransports[environmentName],
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync([OperationQueueModelProvider]),
    MongooseModule.forFeature([
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [OperationQueueController],
  providers: [ClientDecoratorProcessorService, OperationQueueService],
  exports: [OperationQueueService],
})
export class OperationQueueModule {}
