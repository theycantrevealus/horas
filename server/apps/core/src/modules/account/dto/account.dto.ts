import { ApiProperty } from '@nestjs/swagger'
import { Types } from 'mongoose'

export class CAccount {
  @ApiProperty({
    type: String,
    example: `stock_point-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Drugs',
  })
  name: string
}
