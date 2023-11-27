import { ApiProperty } from '@nestjs/swagger'
import { CustomErrorCode } from '@utility/modules'
import mongoose from 'mongoose'

export class GlobalResponse {
  @ApiProperty({
    description: '',
  })
  statusCode: CustomErrorCode

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning message of created',
  })
  message: string

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload?: object

  @ApiProperty({
    example: 'TRANSACTION_NAME_FOR_CLASSIFICATION',
    description: 'Transaction classification',
  })
  transaction_classify: string

  @ApiProperty({
    example: `any-${new mongoose.Types.ObjectId()}`,
    description: 'Transaction ID',
  })
  transaction_id: string | null
}

export class GlobalResponseParsed {
  @ApiProperty({
    description: '',
  })
  statusCode: string

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning message of created',
  })
  message: string

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload?: object

  @ApiProperty({
    example: 'TRANSACTION_NAME_FOR_CLASSIFICATION',
    description: 'Transaction classification',
  })
  transaction_classify: string

  @ApiProperty({
    example: `any-${new mongoose.Types.ObjectId()}`,
    description: 'Transaction ID',
  })
  transaction_id: string | null
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
