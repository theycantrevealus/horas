import { AuthorityJoin, IAuthority } from '@core/account/schemas/authority'
import {
  IMenu,
  IMenuPermission,
  MenuJoin,
  MenuPermissionJoin,
} from '@core/menu/schemas/menu.model'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class AccountEditDTO {
  @ApiProperty({
    type: AuthorityJoin,
    description: '',
  })
  @IsNotEmpty()
  authority: IAuthority

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
    example: 'John',
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  first_name: string

  @ApiProperty({
    example: 'Doe',
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  last_name: string

  @ApiProperty({
    example: '0822996633111',
    minLength: 8,
    maxLength: 13,
    description: 'Contact number',
  })
  @MinLength(8)
  @MaxLength(13)
  @IsNotEmpty()
  @IsString()
  phone: string

  @ApiProperty({
    type: [MenuJoin],
  })
  @IsNotEmpty()
  access: IMenu[]

  @ApiProperty({
    type: [MenuPermissionJoin],
  })
  @IsNotEmpty()
  permission: IMenuPermission[]

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number

  constructor(data: any = {}) {
    this.email = data.email
    this.first_name = data.first_name
    this.last_name = data.last_name
    this.phone = data.phone
    this.access = data.access
    this.permission = data.permission
    this.__v = data.__v
  }
}
