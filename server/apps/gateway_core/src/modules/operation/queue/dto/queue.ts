import { CMasterQueue } from '@gateway_core/master/dto/master.queue'
import { IMasterQueue } from '@gateway_core/master/interface/master.queue'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class QueueAddDTO {
  @ApiProperty({
    type: CMasterQueue,
  })
  @IsNotEmpty()
  machine: IMasterQueue
}
