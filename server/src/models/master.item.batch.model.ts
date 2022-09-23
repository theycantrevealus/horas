import { properties } from '@/utilities/models/column'
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
import { MasterItemModel } from './master.item.model'

@Entity({ name: 'master_item_batch' })
export class MasterItemBatchModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Auto generated code',
  })
  code: string

  @ManyToOne(() => MasterItemModel, (brand) => brand.uid)
  item: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
