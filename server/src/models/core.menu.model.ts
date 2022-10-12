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
import { Corei18nComponentModel } from './core.i18n.compontent.model'
import { AccountModel } from './account.model'
import { CoreMenuPermissionModel } from './core.menu.permission.model'

@Entity({ name: 'core_menu' })
export class CoreMenuModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ApiProperty({
    example: 'Menu caption',
    description: 'Menu caption',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Menu caption',
  })
  name: string

  @ApiProperty({
    example: 'Identifier',
    description: 'Vue 3 support',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Vue 3 support',
  })
  identifier: string

  @ApiProperty({
    example: '/tester/url',
    description: 'Vue 3 route support',
  })
  @IsString()
  @Column({
    nullable: true,
    type: 'text',
    default: '/',
    comment: 'Vue 3 route support',
  })
  url: string

  @ApiProperty({
    example: 1,
    description: 'Other menu id as parent',
  })
  @IsNumber()
  @Column({ type: 'integer', comment: 'Other menu id as parent' })
  parent: number

  @ApiProperty({
    example: 'Menu Grouper Name',
    description: 'Vue 3 support',
  })
  @IsNumber()
  @Type(() => CoreMenuGroupModel)
  @ManyToOne(() => CoreMenuGroupModel, (menu) => menu.id)
  menu_group: CoreMenuGroupModel

  @ApiProperty({
    example: '',
    description: 'PrimeIcon class name',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'PrimeIcon class name',
  })
  icon: string

  @ApiProperty({
    example: 'Y',
    enum: ['Y', 'N'],
    description: 'Y = show, N = hide',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'char',
    length: 1,
    comment: 'Y = show, N = hide',
  })
  show_on_menu: string

  @ApiProperty({
    example: 1,
    description: 'Showing order on side panel',
  })
  @IsNumber()
  @Column({ type: 'integer', comment: 'Showing order on side panel' })
  show_order: number

  @ApiProperty({
    example: 1,
    description: 'Level grouping identifier',
  })
  @IsNumber()
  @Column({
    type: 'integer',
    nullable: true,
    comment: 'Level grouping identifier',
  })
  level: number

  @ApiProperty({
    example: '',
    description: 'Theme customer class name for styling',
  })
  @IsString()
  @Column({
    type: 'character varying',
    nullable: true,
    comment: 'Theme customer class name for styling',
  })
  group_color: string

  @ApiProperty(properties.remark)
  @IsString()
  @Column({ type: 'text' })
  remark: string

  @Type(() => CoreMenuPermissionModel)
  @OneToMany(() => CoreMenuPermissionModel, (permission) => permission.menu, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permissions' })
  permission: CoreMenuPermissionModel[]

  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
