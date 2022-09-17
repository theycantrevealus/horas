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
import { MenuModel } from './menu.model'

@Entity({ name: 'account_privileges' })
export class AccountPrivilegesModel {
    @PrimaryGeneratedColumn('increment')
    id: number

    @ManyToOne(() => AccountModel, account => account.uid)
    account: AccountModel

    @ManyToOne(() => MenuModel, menu => menu.id)
    menu: MenuModel

    @ManyToOne(() => AccountModel, account => account.uid)
    granted_by: AccountModel

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    created_at: Date

    @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    updated_at: Date

    @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
    deleted_at: Date
}
