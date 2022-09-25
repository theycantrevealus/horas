import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsString, IsNumber } from 'class-validator'

export class GrantPermissionDTO {
  @ApiProperty({
    example: 'From Account UID',
    type: String,
  })
  @IsString()
  account: string

  @ApiProperty({
    example: 'From Permission ID',
    type: Number,
  })
  @IsNumber()
  permission: number
}
