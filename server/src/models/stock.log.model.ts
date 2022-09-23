import {
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
} from 'typeorm'
import { MasterItemModel } from './master.item.model'
import { MasterItemBatchModel } from './master.item.batch.model'
import { ColumnNumericTransformer } from '@/utilities/class.transformer.postgres'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'stock_log' })
export class StockLogModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => MasterItemModel, (brand) => brand.uid)
  item: string

  @ManyToOne(() => MasterItemBatchModel, (brand) => brand.uid)
  batch: string

  @Column({
    type: 'enum',
    enum: ['in', 'out'],
    default: 'in',
    comment: 'in or out',
  })
  type: string

  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  qty: number

  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  balance: number

  @Column(properties.remark)
  remark: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
