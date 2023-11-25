import { CMasterQueue } from '@core/master/dto/master.queue'
import { IMasterQueue } from '@core/master/interface/master.queue'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class QueueAddDTO {
  @ApiProperty({
    type: CMasterQueue,
  })
  @IsNotEmpty()
  machine: IMasterQueue
}
