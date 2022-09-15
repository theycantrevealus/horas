import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class AccountAuthorityAddDTO {
  @ApiProperty({
    example: 'Director / Receptionist',
  })
  @IsString()
  name: string
}

export class AccountAuthorityAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Authority Created Successfully' })
  @IsString()
  message: string

  @ApiProperty({ example: 'Authority Created Successfully' })
  returning: any
}
