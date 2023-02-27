import { SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

import { Account } from '../schemas/account.model'

export class AccountSignInDTO {
  @ApiProperty({
    example: 'johndoe@example.com',
    minLength: 8,
    maxLength: 24,
    description: '',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    example: '12345678',
    minLength: 6,
    maxLength: 24,
    description: '',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  @IsString()
  password: string
}

export const PICSchema = SchemaFactory.createForClass(Account)
