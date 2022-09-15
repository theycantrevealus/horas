import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'
import { AccountModel } from '@/model/account.model'

export class AccountLoginDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'takashitanaka@horas.com',
  })
  @IsString()
  email: string

  @ApiProperty({
    minLength: 6,
    example: '123456',
  })
  @IsString()
  password: string
}

export class AccountLoginResponseDTO {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'user_login_success' })
  @IsString()
  message: string

  @ApiProperty({
    example: {
      uid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      email: 'example@domain.com',
      first_name: 'John',
      last_name: 'Doe',
    },
    nullable: true,
  })
  user: AccountModel

  @ApiProperty({ example: 'ey...' })
  @IsString()
  token: string

  @ApiProperty({ example: null, nullable: true })
  errors: { [key: string]: any }

  account: any
}

export interface InterfaceAccount {
  uid: string
  email: string
  first_name: string
  last_name: string
  password: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}
