import { properties } from '@/utilities/models/column'
import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'

@Entity({ name: 'menu_group' })
export class CoreMenuGroupModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ApiProperty({
    example: 'Menu Group Name',
    description: 'Group will menu at sidebar',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Group will menu at sidebar',
  })
  name: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
