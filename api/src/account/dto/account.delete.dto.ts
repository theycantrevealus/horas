import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class AccountDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Authority Deleted Successfully' })
  @IsString()
  message: string

  returning: any
}
