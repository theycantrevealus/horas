import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  PrimaryColumn,
  Generated,
} from 'typeorm'
import { IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { MasterItemBrandModel } from './master.item.brand.model'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'master_stock_point' })
export class MasterStockPointModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @ApiProperty({
    example: 'Stock Point name',
    description:
      'A stock point is a location that contains stock inventory. You can specify several stock point to hold any stock for any purposes',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment:
      'A stock point is a location that contains stock inventory. You can specify several stock point to hold any stock for any purposes',
  })
  name: string

  @ApiProperty({
    example: 'Address',
    description: 'A stock may placed at different location one each others',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'A stock may placed at different location one each others',
  })
  address: string

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
