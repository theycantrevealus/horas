import { properties } from '@/utilities/models/column'
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
import { AccountModel } from './account.model'
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'account_privileges' })
export class AccountPrivilegesModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => AccountModel, (account) => account.uid)
  account: AccountModel

  @ManyToOne(() => CoreMenuModel, (menu) => menu.id)
  menu: CoreMenuModel

  @ManyToOne(() => AccountModel, (account) => account.uid)
  granted_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
