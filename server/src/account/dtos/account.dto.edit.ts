import { AccountAuthorityModel } from '@/models/account.authority.model'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsString, IsNumber, IsArray } from 'class-validator'
import { AccountPermissionDTO } from './account.dto.permissions'
import { AccountPrivilegesDTO } from './account.dto.privileges'

export class AccountEditDTO {
  @ApiProperty({
    example: 'John',
  })
  @IsString()
  first_name: string

  @ApiProperty({
    example: 'Doe',
  })
  @IsString()
  last_name: string

  @ApiProperty({
    example: 0,
    type: AccountAuthorityModel,
  })
  @IsNumber()
  authority: AccountAuthorityModel

  @ApiProperty({
    example: 'Doe',
    minLength: 8,
    maxLength: 16,
  })
  @IsString()
  password: string

  @ApiProperty({
    isArray: true,
    type: Number,
  })
  @IsArray()
  selectedPage: number[]

  @ApiProperty({
    isArray: true,
    type: Number,
  })
  @IsArray()
  selectedPermission: number[]

  @ApiProperty({
    isArray: true,
    type: Number,
  })
  @IsArray()
  selectedParent: number[]
}
