import { Module } from '@nestjs/common'

import { EventsGateway } from './event.gateway'

@Module({
  providers: [EventsGateway],
})
export class EventsModule {}
