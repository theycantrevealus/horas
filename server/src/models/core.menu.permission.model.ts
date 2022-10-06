import { properties } from '@/utilities/models/column'
import { ApiProperty } from '@nestjs/swagger'
import { IsString, ValidateNested } from 'class-validator'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'
import { AccountModel } from './account.model'
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'core_menu_permission' })
export class CoreMenuPermissionModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ApiProperty({
    example: 'Identifier',
    description: 'Vue 3 support',
  })
  @ValidateNested()
  @ManyToOne(() => CoreMenuModel, (menu) => menu.id)
  menu: CoreMenuModel

  @ApiProperty({
    example: '#DOMIdentifier',
    description: 'For identify dom that granted access',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'For identify dom that granted access',
  })
  domiden: string

  @ApiProperty({
    example: 'dispatchingString()',
    description: 'String dispatch from the dom',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'String dispatch from the dom',
  })
  dispatchname: string

  @ApiProperty({
    example: 'ServiceName',
    description: 'For identify dom service name that contain dispatch function',
  })
  @IsString()
  @Column({
    type: 'character varying',
    comment: 'For identify dom service name that contain dispatch function',
  })
  servicegroup: string

  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
