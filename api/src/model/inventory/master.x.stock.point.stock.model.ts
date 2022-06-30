import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { MasterItemModel } from './master.item.model'
import { MasterItemBatchModel } from './master.item.batch.model'
import { MasterStockItemModel } from './master.stock.point.model'

@Entity({ name: 'master_x_item_alias' })
export class MasterXStockPointStockModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => MasterStockItemModel, item => item.uid)
  stock_point: MasterStockItemModel

  @ManyToOne(() => MasterItemModel, item => item.uid)
  item: MasterItemModel

  @ManyToOne(() => MasterItemBatchModel, item => item.uid)
  batch: MasterItemBatchModel

  @Column({ nullable: false, type: 'decimal' })
  stock: number

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
