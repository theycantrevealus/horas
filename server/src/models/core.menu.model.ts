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

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Menu caption',
  })
  name: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Vue 3 support',
  })
  identifier: string

  @Column({
    nullable: true,
    type: 'text',
    default: '/',
    comment: 'Vue 3 route support',
  })
  url: string

  @Column({ type: 'integer', comment: 'Other menu id as parent' })
  parent: number

  @Type(() => CoreMenuGroupModel)
  @ManyToOne(() => CoreMenuGroupModel, (menu) => menu.id)
  menu_group: CoreMenuGroupModel

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'PrimeIcon class name',
  })
  icon: string

  @Column({
    nullable: false,
    type: 'char',
    length: 1,
    comment: 'Y = show, N = hide',
  })
  show_on_menu: string

  @Column({ type: 'integer', comment: 'Showing order on side panel' })
  show_order: number

  @Column({
    type: 'integer',
    nullable: true,
    comment: 'Level grouping identifier',
  })
  level: number

  @Column({
    type: 'character varying',
    nullable: true,
    comment: 'Theme customer class name for styling',
  })
  group_color: string

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
