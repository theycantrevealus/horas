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

@Entity({ name: 'master_item_category' })
export class MasterItemCategoryModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({
    nullable: false,
    type: 'character varying',
    unique: true,
    comment: 'Auto generated code',
  })
  code: string

  @ApiProperty({
    example: 'Category Name of Items',
    description: 'Common name to identify current item category',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Common name to identify current item category',
  })
  name: string

  @ApiProperty({
    example: '',
    type: MasterItemCategoryModel,
    description: 'If it is child of any item category',
  })
  @ValidateNested()
  @ManyToOne(
    () => MasterItemCategoryModel,
    (category_parent) => category_parent.id
  )
  parent: MasterItemCategoryModel

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
