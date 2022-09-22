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
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'menu_permission' })
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
  @Column({ nullable: false, type: 'character varying' })
  domiden: string

  @ApiProperty({
    example: 'dispatchingString()',
    description: 'String dispatch from the dom',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying' })
  dispatchname: string

  @ApiProperty({
    example: 'ServiceName',
    description: 'For identify dom service name that contain dispatch function',
  })
  @IsString()
  @Column({ type: 'character varying' })
  servicegroup: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
