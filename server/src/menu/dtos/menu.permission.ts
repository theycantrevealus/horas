import { AccountModel } from '@/models/account.model'
import { CoreMenuModel } from '@/models/core.menu.model'
import { properties } from '@/utilities/models/column'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator'

export class CoreMenuPermissionDTO {
  @ApiProperty({
    type: CoreMenuModel,
    example: 0,
  })
  @IsNotEmpty()
  menu: CoreMenuModel

  @ApiProperty({
    example: '#DOMIdentifier',
    description: 'For identify dom that granted access',
  })
  @IsString()
  domiden: string

  @ApiProperty({
    example: 'dispatchingString()',
    description: 'String dispatch from the dom',
  })
  @IsString()
  dispatchname: string

  @ApiProperty({
    example: 'ServiceName',
    description: 'For identify dom service name that contain dispatch function',
  })
  @IsString()
  servicegroup: string
}
