import {
  AuthorityJoin,
  IAuthority,
} from '@core/account/schemas/authority.model'
import { CMenu, CMenuPermission } from '@core/menu/schemas/menu.model'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator'

export class AccountAddDTO {
  @ApiProperty({
    type: AuthorityJoin,
    description: '',
    required: false,
  })
  @IsOptional()
  authority?: IAuthority

  @ApiProperty({
    example: 'johndoe@example.com',
    description: '',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    example: '12345678',
    minLength: 8,
    description: '',
  })
  @MinLength(8)
  @IsNotEmpty()
  password: string

  @ApiProperty({
    example: 'John',
    description: '',
  })
  @MinLength(3)
  @IsNotEmpty()
  @IsString()
  first_name: string

  @ApiProperty({
    example: 'Doe',
    required: false,
    description: '',
  })
  @IsString()
  @IsOptional()
  last_name?: string

  @ApiProperty({
    example: '0822996633111',
    minLength: 8,
    maxLength: 13,
    description: 'Contact number',
  })
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string

  @ApiProperty({
    type: CMenu,
    isArray: true,
    required: false,
  })
  @IsArray()
  @IsOptional()
  access?: CMenu[]

  @ApiProperty({
    type: CMenuPermission,
    isArray: true,
    required: false,
  })
  @IsArray()
  @IsOptional()
  permission?: CMenuPermission[]

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
