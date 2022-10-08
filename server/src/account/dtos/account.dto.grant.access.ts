import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class GrantAccessDTO {
  @ApiProperty({
    example: 'From Account UID',
    type: Number,
  })
  @IsString()
  account: number

  @ApiProperty({
    example: 'From Menu UID',
    type: Number,
  })
  @IsNumber()
  menu: number
}
