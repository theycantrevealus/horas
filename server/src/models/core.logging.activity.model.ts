import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AccountModel } from '@models/account.model'
import { CoreLogLoginModel } from '@models/core.logging.login.model'
import { properties } from '@/utilities/models/column'

@Entity('core_log_activity')
export class CoreLogActivityModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => AccountModel, (account) => account.uid)
  account: AccountModel

  @ManyToOne(() => CoreLogLoginModel, (login) => login.id)
  login_id: CoreLogLoginModel

  @Column({ type: 'character varying', comment: 'Http request type' })
  method: string

  @Column({
    type: 'character varying',
    comment: 'Table that affected by changes',
  })
  table_target: string

  @Column({
    type: 'character varying',
    comment: 'Foreign identifier that affected',
  })
  table_identifier: string

  @Column({ type: 'text', comment: 'Http request meta data' })
  log_meta: string

  @Column({ type: 'char', length: 1, comment: 'Data changes behavior' })
  action: string

  @Column({ type: 'text', comment: 'Old data before affected' })
  old_meta: string

  @Column({ type: 'text', comment: 'New data after affected' })
  new_meta: string

  @CreateDateColumn(properties.logged_at)
  logged_at: Date

  constructor(data?: any) {
    this.account = data?.account
    this.login_id = data?.login_id
    this.table_target = data?.table_target
    this.table_identifier = data?.table_identifier
    this.log_meta = data?.log_meta
    this.action = data?.action
    this.old_meta = data?.old_meta
    this.new_meta = data?.new_meta
    this.new_meta = data?.new_meta
  }
}
