import { CoreMenuPermissionModel } from '@/models/core.menu.permission.model'
import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class AccountPermissionDTO {
  @ApiProperty({
    example: 0,
    description: 'Menu ID',
  })
  @IsString()
  permission: CoreMenuPermissionModel
}
