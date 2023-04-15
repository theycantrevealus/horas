import { CMenu } from '@core/menu/schemas/menu.model'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

export class AccountAddDTO {
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
    minLength: 8,
    maxLength: 24,
    description: '',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  @IsEmail()
  password: string

  @ApiProperty({
    example: 'John',
    minLength: 6,
    maxLength: 24,
    description: '',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  @IsString()
  first_name: string

  @ApiProperty({
    example: 'Doe',
    minLength: 6,
    maxLength: 24,
    description: '',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  @IsString()
  last_name: string

  @ApiProperty({
    example: '0822996633111',
    minLength: 8,
    maxLength: 13,
    required: true, // Not neccessary. It will be always true if not defined
    description: 'Contact number',
  })
  @MinLength(8)
  @MaxLength(13)
  @IsNotEmpty()
  @IsString()
  phone: string

  @ApiProperty({
    type: CMenu,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @IsNotEmpty()
  access: CMenu[]

  @ApiProperty({
    type: String,
    isArray: true,
  })
  @IsNotEmpty()
  permission: string[]

  constructor(data: any = {}) {
    this.email = data.email
    this.first_name = data.first_name
    this.last_name = data.last_name
    this.password = data.password
    this.phone = data.phone
    this.access = data.access
    this.permission = data.permission
  }
}
