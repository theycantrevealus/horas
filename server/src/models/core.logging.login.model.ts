import { AccountModel } from './account.model'
import {
  Column,
  CreateDateColumn,
  ManyToOne,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('core_log_login')
export class CoreLogLoginModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => AccountModel, (account) => account.uid)
  account: AccountModel

  @Column({ type: 'text' })
  log_meta: string

  @Column({ type: 'text' })
  token: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  logged_at: Date
}
