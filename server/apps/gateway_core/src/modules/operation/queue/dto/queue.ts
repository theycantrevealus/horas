import { CMasterQueueMachine } from '@gateway_core/master/dto/master.queue.machine'
import { IMasterQueueMachine } from '@gateway_core/master/interface/master.queue'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class QueueAddDTO {
  @ApiProperty({
    type: CMasterQueueMachine,
  })
  @IsNotEmpty()
  machine: IMasterQueueMachine
}
