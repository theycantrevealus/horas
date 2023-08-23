import {
  IMasterQueue,
  MasterQueueJoin,
} from '@core/master/schemas/master.queue.machine'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class QueueAddDTO {
  @ApiProperty({
    type: MasterQueueJoin,
  })
  @IsNotEmpty()
  machine: IMasterQueue
}
