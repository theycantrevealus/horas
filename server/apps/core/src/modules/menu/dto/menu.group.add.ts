import { Account } from '@core/account/schemas/account.model'
import { ApiProperty } from '@nestjs/swagger'

export class MenuGroupAddDTO {
  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  name: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  description: string

  created_by: Account

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Document version',
  })
  __v: number
}
