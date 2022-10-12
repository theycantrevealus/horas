import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { CoreMenuGroupModel } from '@models/core.menu.group.model'
import { IsNumber, IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { properties } from '@/utilities/models/column'
import { Type } from 'class-transformer'
import { CoreMenuPermissionDTO } from './menu.permission'

export class CoreMenuDTOAdd {
  @ApiProperty({
    example: 'Menu caption',
    description: 'Menu caption',
  })
  @IsString()
  name: string

  @ApiProperty({
    example: 'Identifier',
    description: 'Vue 3 support',
  })
  @IsString()
  identifier: string

  @ApiProperty({
    example: '/tester/url',
    description: 'Vue 3 route support',
  })
  @IsString()
  url: string

  @ApiProperty({
    example: 1,
    description: 'Other menu id as parent',
  })
  @IsNumber()
  parent: number

  @ApiProperty({
    isArray: true,
    description: 'Vue 3 support',
    type: CoreMenuPermissionDTO,
  })
  @IsNumber()
  menu_group: CoreMenuPermissionDTO[]

  @ApiProperty({
    example: '',
    description: 'PrimeIcon class name',
  })
  @IsString()
  icon: string

  @ApiProperty({
    example: 'Y',
    enum: ['Y', 'N'],
    description: 'Y = show, N = hide',
  })
  @IsString()
  show_on_menu: string

  @ApiProperty({
    example: 1,
    description: 'Showing order on side panel',
  })
  @IsNumber()
  show_order: number

  @ApiProperty({
    example: 1,
    description: 'Level grouping identifier',
  })
  @IsNumber()
  level: number

  @ApiProperty({
    example: '',
    description: 'Theme customer class name for styling',
  })
  @IsString()
  group_color: string

  @ApiProperty(properties.remark)
  @IsString()
  remark: string
}
