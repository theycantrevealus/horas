import { CAccount } from '@gateway_core/account/dto/account.dto'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { CLOV } from '@gateway_core/lov/dto/lov'
import { CMasterQueueMachine } from '@gateway_core/master/dto/master.queue.machine'
import { CMasterReceptionistCounter } from '@gateway_core/master/dto/master.receptionist.counter'
import { ApiProperty } from '@nestjs/swagger'
import { ILOV } from '@schemas/lov/lov.interface'
import { IQueue } from '@schemas/management/queue.interface'
import { IMasterQueueMachine } from '@schemas/master/master.queue.machine'
import { IMasterReceptionistCounter } from '@schemas/master/master.receptionist.counter'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator'
import { Types } from 'mongoose'

export class CQueue {
  @ApiProperty({
    type: String,
    example: `queue-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: Number,
    example: 1,
  })
  queue_number: number

  @ApiProperty({
    type: CLOV,
  })
  type: ILOV
}

export class QueueMachineAddQueueDTO {
  @ApiProperty({
    type: CMasterQueueMachine,
    description: 'Queue machine',
    required: true,
  })
  @IsNotEmpty()
  @Type(() => CMasterQueueMachine)
  @ValidateNested({ each: true })
  queue_machine: IMasterQueueMachine

  @ApiProperty({
    type: CLOV,
    description: 'Queue type',
    required: true,
  })
  @IsNotEmpty()
  @Type(() => CLOV)
  @ValidateNested({ each: true })
  type: ILOV
}

export class ReceptionistCounterAssignDTO {
  @ApiProperty({
    type: CAccount,
    required: true,
    description: 'Account to assigned',
  })
  @IsNotEmpty()
  account: IAccount

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}

export class CallQueueDTO {
  @ApiProperty({
    type: CMasterReceptionistCounter,
    required: true,
    description: 'Receptionist counter',
  })
  @IsNotEmpty()
  receptionist_counter: IMasterReceptionistCounter

  @ApiProperty({
    type: CQueue,
    required: true,
    description: 'Queue',
  })
  @IsNotEmpty()
  queue: IQueue
}
