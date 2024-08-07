import { CMenu, CMenuPermission } from '@core/menu/dto/menu'
import { IMenu } from '@core/menu/interfaces/menu.interface'
import { IMenuPermission } from '@core/menu/interfaces/menu.permission.interface'
import { ApiProperty } from '@nestjs/swagger'
import { CAuthority, IAuthority } from '@schemas/account/authority.model'
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Types } from 'mongoose'

export class AccountAddDTO {
  @ApiProperty({
    type: CAuthority,
    description: '',
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  authority?: IAuthority

  @ApiProperty({
    example: 'johndoe@example.com',
    description: '',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    example: 'xxxxx',
    description: '',
    required: false,
  })
  @IsString()
  code?: string

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
    description: '',
    isArray: true,
    required: false,
  })
  @IsOptional()
  access?: IMenu[]

  @ApiProperty({
    type: CMenuPermission,
    description: '',
    isArray: true,
    required: false,
  })
  @IsOptional()
  permission?: IMenuPermission[]
}

export class AccountEditDTO {
  @ApiProperty({
    type: CAuthority,
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
    example: 'xxxxx',
    description: '',
    required: false,
  })
  @IsString()
  code?: string

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
    required: false,
    isArray: true,
    type: CMenu,
  })
  @IsArray()
  @IsOptional()
  access?: IMenu[]

  @ApiProperty({
    required: false,
    isArray: true,
    type: CMenuPermission,
  })
  @IsArray()
  @IsOptional()
  permission?: IMenuPermission[]

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}

export class CAccount {
  @ApiProperty({
    type: String,
    example: `stock_point-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Drugs',
  })
  name: string
}
