import { CMasterQueueMachine } from '@gateway_core/master/dto/master.queue.machine'
import { ApiProperty } from '@nestjs/swagger'
import { IMasterQueueMachine } from '@schemas/master/master.queue.machine'
import { IsNotEmpty } from 'class-validator'

export class QueueAddDTO {
  @ApiProperty({
    type: CMasterQueueMachine,
  })
  @IsNotEmpty()
  machine: IMasterQueueMachine
}
