import { AccountModel } from '@/models/account.model'
import { CoreMenuModel } from '@/models/core.menu.model'
import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class AccountPrivilegesDTO {
  @ApiProperty({
    example: 0,
    description: 'Menu ID',
  })
  @IsString()
  menu: CoreMenuModel
}
