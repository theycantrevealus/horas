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

  @ManyToOne(() => AccountModel, (account) => account.id)
  account: AccountModel

  @ManyToOne(() => CoreMenuModel, (menu) => menu.id)
  menu: CoreMenuModel

  @ManyToOne(() => AccountModel, (account) => account.id)
  granted_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date

  constructor(data: any) {
    this.account = data?.account
    this.menu = data?.menu
    this.granted_by = data?.granted_by
  }
}
