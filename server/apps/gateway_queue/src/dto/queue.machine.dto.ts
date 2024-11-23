import { CAccount } from '@gateway_core/account/dto/account.dto'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { CMasterQueueMachine } from '@gateway_core/master/dto/master.queue.machine'
import { ApiProperty } from '@nestjs/swagger'
import { CLOV, ILOV } from '@schemas/lov/lov'
import { IMasterQueueMachine } from '@schemas/master/master.queue.machine'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator'

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
