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

  @ManyToOne(() => AccountModel, (account) => account.uid, { cascade: true })
  account: AccountModel

  @Column({ type: 'text' })
  log_meta: string

  @CreateDateColumn({
    nullable: false,
    type: 'timestamp without time zone',
    default: new Date().toISOString(),
  })
  logged_at: Date
}
