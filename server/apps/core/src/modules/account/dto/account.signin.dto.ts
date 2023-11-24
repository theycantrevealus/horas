import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty } from 'class-validator'

export class AccountSignInDTO {
  @ApiProperty({
    example: 'johndoe@example.com',
    description: '',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    example: '12345678',
    description: '',
  })
  @IsNotEmpty()
  password: string
}
