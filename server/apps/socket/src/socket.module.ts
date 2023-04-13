import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { EventsModule } from './events/event.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/environment/${
        process.env.NODE_ENV === '' ? '' : process.env.NODE_ENV
      }.env`,
      load: [ApplicationConfig, MongoConfig, SocketConfig],
    }),
    EventsModule,
  ],
})
export class SocketModule {}
