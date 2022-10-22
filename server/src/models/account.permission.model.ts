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
import { AccountModel } from '@models/account.model'
import { CoreMenuPermissionModel } from '@models/core.menu.permission.model'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'account_permission' })
export class AccountPermissionModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => AccountModel, (account) => account.id)
  account: AccountModel

  @ManyToOne(() => CoreMenuPermissionModel, (perm) => perm.id)
  permission: CoreMenuPermissionModel

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
    this.permission = data?.permission
    this.granted_by = data?.granted_by
  }
}
