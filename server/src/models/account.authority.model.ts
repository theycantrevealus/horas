import { properties } from '@/utilities/models/column'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'
import { AccountModel } from './account.model'

@Entity({ name: 'account_authority' })
export class AccountAuthorityModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ nullable: false, type: 'character varying' })
  name: string

  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
