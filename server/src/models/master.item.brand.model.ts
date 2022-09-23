import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  PrimaryColumn,
  Generated,
} from 'typeorm'
import { IsNumber, IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'master_item_brand' })
export class MasterItemBrandModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @Column({
    nullable: false,
    type: 'character varying',
    unique: true,
    comment: 'Auto generated code',
  })
  code: string

  @ApiProperty({
    example: 'Brand Name of Items',
    description: 'Common name to identify brands',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Common name to identify brands',
  })
  name: string

  @ApiProperty({
    example: 'Just remark to describe something',
    required: false,
  })
  @IsString()
  @Column(properties.remark)
  remark: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
