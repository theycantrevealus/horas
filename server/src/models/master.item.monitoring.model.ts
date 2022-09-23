import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  Generated,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'
import { IsNumber, IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { MasterStockPointModel } from './master.stock.point.model'
import { MasterItemModel } from './master.item.model'
import { ColumnNumericTransformer } from '@/utilities/class.transformer.postgres'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'master_item_monitoring' })
export class MasterItemMonitoringModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ApiProperty({
    example: '',
    type: MasterStockPointModel,
    description: 'What item to monitor',
  })
  @ValidateNested()
  @ManyToOne(() => MasterItemModel, (foreign) => foreign.uid)
  item: string

  @ApiProperty({
    example: '',
    type: MasterStockPointModel,
    description: 'Where to monitoring',
  })
  @ValidateNested()
  @ManyToOne(() => MasterStockPointModel, (foreign) => foreign.uid)
  stock_point: string

  @ApiProperty({
    example: 10,
    type: Number,
    description: 'Minimum quantity so system will allert stock point officer',
  })
  @IsNumber()
  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  minimum: number

  @ApiProperty({
    example: 400,
    type: Number,
    description: 'Maximum quantity if exceed it will warn stock point officer',
  })
  @IsNumber()
  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  maximum: number

  @ApiProperty({
    example: 'B3R5',
    description: 'Rack location labelling so make it easier to found',
  })
  @IsString()
  @Column({
    type: 'character varying',
    comment: 'Rack location labelling so make it easier to found',
  })
  location: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
