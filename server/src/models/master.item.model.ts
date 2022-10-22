import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  PrimaryColumn,
  Generated,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { MasterItemBrandModel } from './master.item.brand.model'
import { properties } from '@/utilities/models/column'
import { AccountModel } from './account.model'

@Entity({ name: 'master_item' })
export class MasterItemModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ApiProperty({
    example: 'Item main name',
    description: 'Common name to identify current item',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Common name to identify current item',
  })
  name: string

  @ApiProperty({
    example: '',
    type: MasterItemBrandModel,
    description: 'Item brand',
  })
  @ValidateNested()
  @ManyToOne(() => MasterItemBrandModel, (brand) => brand.id)
  brand: MasterItemBrandModel

  @ApiProperty({
    example: 'Just remark to describe something',
    required: false,
  })
  @IsString()
  @Column(properties.remark)
  remark: string

  @ApiProperty({
    example: '',
    type: AccountModel,
    description: 'Account who create purchase order',
  })
  @ValidateNested()
  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
