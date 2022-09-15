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
import { MasterItemManufactureModel } from './master.item.manufacture.model'

@Entity({ name: 'master_x_item_manufacture' })
export class MasterXItemManufactureModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => MasterItemModel, (item) => item.uid)
  item: MasterItemModel

  @ManyToOne(() => MasterItemManufactureModel, (manufacture) => manufacture.uid)
  manufacture: MasterItemManufactureModel

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
