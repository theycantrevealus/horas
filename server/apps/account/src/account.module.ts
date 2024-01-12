import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ClientsModule } from '@nestjs/microservices'
import { DecoratorProcessorService } from '@utility/decorator'
import { environmentName } from '@utility/environtment'
import { KafkaConn } from '@utility/kafka'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'

import { AccountController } from './account.controller'
import { AccountService } from './account.service'

@Module({
  imports: [
    ClientsModule.registerAsync([KafkaConn.account[0]]),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          handleRejections: true,
          handleExceptions: true,
          colorize: configService.get<boolean>('application.log.colorize'),
          transports: WinstonCustomTransports[environmentName],
        }
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AccountController],
  providers: [AccountService, DecoratorProcessorService],
})
export class AccountModule {}
