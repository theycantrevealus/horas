import { properties } from '@/utilities/models/column'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsString, ValidateNested } from 'class-validator'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  OneToMany,
} from 'typeorm'
import { AccountModel } from './account.model'
import { AccountPermissionModel } from './account.permission.model'
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'core_menu_permission' })
export class CoreMenuPermissionModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Type(() => AccountPermissionModel)
  @OneToMany(
    () => AccountPermissionModel,
    (account_permission) => account_permission.permission,
    {
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }
  )
  @JoinColumn({
    name: 'account_permission',
    foreignKeyConstraintName: 'permission',
  })
  account_permission: AccountPermissionModel

  @Type(() => CoreMenuModel)
  @ManyToOne(() => CoreMenuModel, (menu) => menu.permission, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    orphanedRowAction: 'delete',
    cascade: ['insert', 'update'],
    eager: true,
  })
  @JoinColumn({ name: 'menu_id' })
  menu: CoreMenuModel

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'For identify dom that granted access',
  })
  domiden: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'String dispatch from the dom',
  })
  dispatchname: string

  // @Column({
  //   type: 'character varying',
  //   comment: 'For identify dom service name that contain dispatch function',
  // })
  // servicegroup: string

  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
