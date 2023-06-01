import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { Inject, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { environmentIdentifier } from '@utility/environtment'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

import { EventsModule } from './events/event.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, SocketConfig],
    }),
    EventsModule,
  ],
})
export class SocketModule {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    //
  }
}
