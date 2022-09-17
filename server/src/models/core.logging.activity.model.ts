import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AccountModel } from '@models/account.model'
import { CoreLogLoginModel } from '@models/core.logging.login.model'

@Entity('core_log_activity')
export class CoreLogActivityModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => AccountModel, (account) => account.uid)
  account: AccountModel

  @ManyToOne(() => CoreLogLoginModel, (login) => login.id)
  login_id: CoreLogLoginModel

  @Column({ type: 'character varying' })
  method: string

  @Column({ type: 'character varying' })
  table_target: string

  @Column({ type: 'character varying' })
  table_identifier: string

  @Column({ type: 'text' })
  log_meta: string

  @Column({ type: 'char', length: 1 })
  action: string

  @Column({ type: 'text' })
  old_meta: string

  @Column({ type: 'text' })
  new_meta: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  logged_at: Date

  constructor(data?: any) {
    this.account = data.account
    this.login_id = data.login_id
    this.table_target = data.table_target
    this.table_identifier = data.table_identifier
    this.log_meta = data.log_meta
    this.action = data.action
    this.old_meta = data.old_meta
    this.new_meta = data.new_meta
    this.new_meta = data.new_meta
  }
}
