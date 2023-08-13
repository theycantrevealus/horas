import { BPJSConfig } from '@configuration/3rdparty/bpjs'
import { BpjsController } from '@core/3rdparty/bpjs/bpjs.controller'
import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { BPJSReferenceService } from '@core/3rdparty/bpjs/services/reference.service'
import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: environmentIdentifier,
      load: [BPJSConfig],
    }),
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
    HttpModule,
    AuthModule,
  ],
  controllers: [BpjsController],
  providers: [BPJSAuthService, BPJSReferenceService],
})
export class BpjsModule {
  constructor() {}
}
