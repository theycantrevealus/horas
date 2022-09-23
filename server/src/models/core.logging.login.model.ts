import { AccountModel } from './account.model'
import {
  Column,
  CreateDateColumn,
  ManyToOne,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { properties } from '@/utilities/models/column'

@Entity('core_log_login')
export class CoreLogLoginModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => AccountModel, (account) => account.uid, { cascade: true })
  account: AccountModel

  @Column({ type: 'text', comment: 'Login meta request' })
  log_meta: string

  @CreateDateColumn(properties.logged_at)
  logged_at: Date
}
