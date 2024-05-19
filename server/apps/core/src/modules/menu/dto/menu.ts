import { CMenuGroup } from '@core/menu/dto/menu.group.add'
import { IMenuGroup } from '@core/menu/interfaces/menu.group.interface'
import { IMenu } from '@core/menu/interfaces/menu.interface'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator'
import { Types } from 'mongoose'

export class CMenu {
  @ApiProperty({
    type: String,
    example: `menu-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'Menu Name',
  })
  name: string

  @ApiProperty({
    type: String,
    example: '/',
  })
  url: string

  @ApiProperty({
    type: String,
    example: '',
  })
  identifier: string
}

export class CMenuPermission {
  @ApiProperty({
    type: String,
    example: '',
  })
  domIdentity: string

  @ApiProperty({
    type: String,
    example: '',
  })
  dispatchName: string

  @ApiProperty({
    description: '',
  })
  // @Type(() => CMenu)
  @ValidateNested({ each: true })
  menu: IMenu
}

export class MenuAddDTO {
  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  name: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'UI identifier',
  })
  identifier: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu target url',
  })
  url: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Icon class',
  })
  icon: string

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Show/hide menu',
  })
  show_on_menu: boolean

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Display order',
  })
  show_order: number

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Display level',
  })
  level: number

  @ApiProperty({
    type: String,
    example: '',
    description: 'Class color',
  })
  group_color: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Remark',
  })
  remark: string

  @ApiProperty({
    type: String,
    example: `menu-${new Types.ObjectId().toString()}`,
    description: 'Menu parent',
  })
  parent: string

  @ApiProperty({
    type: CMenuPermission,
    isArray: true,
  })
  @IsNotEmpty()
  permission: CMenuPermission[]

  @ApiProperty({
    type: String,
    enum: ['web', 'android', 'ios', 'windows', 'linux'],
    example: '',
    description: 'For channel',
  })
  channel: string

  @ApiProperty({
    type: CMenuGroup,
  })
  menu_group: IMenuGroup
}

export class MenuEditDTO {
  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  name: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'UI identifier',
  })
  identifier: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu target url',
  })
  url: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Icon class',
  })
  icon: string

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Show/hide menu',
  })
  show_on_menu: boolean

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Display order',
  })
  show_order: number

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Display level',
  })
  level: number

  @ApiProperty({
    type: String,
    example: '',
    description: 'Class color',
  })
  group_color: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Remark',
  })
  remark: string

  @ApiProperty({
    type: String,
    example: `menu-${new Types.ObjectId().toString()}`,
    description: 'Menu parent',
  })
  parent: string

  @ApiProperty({
    type: String,
    enum: ['web', 'android', 'ios', 'windows', 'linux'],
    example: '',
    description: 'For channel',
  })
  channel: string

  @ApiProperty({
    type: CMenuGroup,
  })
  menu_group: IMenuGroup

  @ApiProperty({
    type: CMenuPermission,
    isArray: true,
  })
  @IsNotEmpty()
  permission: CMenuPermission[]

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number

  constructor(data: any) {
    this.name = data.name
    this.identifier = data.identifier
    this.url = data.url
    this.icon = data.icon
    this.show_on_menu = data.show_on_menu
    this.show_order = data.show_order
    this.level = data.level
    this.group_color = data.group_color
    this.remark = data.remark
    this.channel = data.channel
    this.permission = data.permission
    this.menu_group = data.menu_group
    this.parent = data.parent
    this.__v = data.__v
  }
}
