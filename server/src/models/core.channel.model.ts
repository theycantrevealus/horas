import { properties } from '@/utilities/models/column'
import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'
import { AccountModel } from './account.model'

@Entity({ name: 'core_channel' })
export class CoreChannelModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Clients IP that hit service',
  })
  ip: string

  @Column(properties.remark)
  remark: string

  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
