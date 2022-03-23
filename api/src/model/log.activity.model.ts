import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { AccountModel } from "./account.model"
import { LogLoginModel } from "./log.login.model"

@Entity('log_activity')
export class LogActivityModel {
    @PrimaryGeneratedColumn('increment')
    id: number

    @ManyToOne(() => AccountModel, account => account.uid)
    user: AccountModel

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

    @ManyToOne(() => LogLoginModel, logLogin => logLogin.id)
    login_id: LogLoginModel

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    logged_at: Date
}