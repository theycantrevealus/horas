import { HttpStatus } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { gen_uuid } from '@utilities/mod.lib'

export class GlobalResponse {
  @ApiProperty({
    example: HttpStatus.CREATED,
    description: 'Created',
  })
  statusCode: number

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning message of created',
  })
  message: string

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: object

  @ApiProperty({
    example: 'POST',
    description: '',
    default: 'UNDEFINED',
  })
  method: string

  @ApiProperty({
    example: 'TRANSACTION_NAME_FOR_CLASSIFICATION',
    description: 'Transaction classification',
  })
  transaction_classify: string

  @ApiProperty({
    example: 'TABLE_NAME',
    description: 'For identify table process',
    required: false,
  })
  table_target: string

  @ApiProperty({
    example: 'I',
    description: 'Action for revert transaction',
  })
  action: string

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Transaction ID',
  })
  transaction_id: number
}

export class GlobalErrorResponse {
  @ApiProperty({
    example: 666,
    description: 'Error status code',
  })
  statusCode: number

  @ApiProperty({
    example: ['Error 1', 'Error 2', 'Error 3'],
    description: 'Returning list of error',
  })
  message: string[]

  @ApiProperty({
    example: 'Error cause of...',
    description: 'Error description',
  })
  description: string

  @ApiProperty({
    example: new Date(),
    description: 'When is the error occuring. For logging purpose',
  })
  timestamp: string

  @ApiProperty({
    example: '/path',
    description: 'Where is the error is occuring. For logging purpose',
  })
  path: string
}
