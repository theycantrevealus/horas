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

@Entity({ name: 'account_permission' })
export class AccountPermissionModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => AccountModel, (account) => account.uid)
  account: AccountModel

  @ManyToOne(() => CoreMenuPermissionModel, (perm) => perm.id)
  permission: CoreMenuPermissionModel

  @ManyToOne(() => AccountModel, (account) => account.uid)
  granted_by: AccountModel

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
