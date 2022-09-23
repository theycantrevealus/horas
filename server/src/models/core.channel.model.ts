import { properties } from '@/utilities/models/column'
import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'

@Entity({ name: 'core_channel' })
export class CoreChannelModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Clients IP that hit service',
  })
  ip: string

  @Column(properties.remark)
  remark: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
