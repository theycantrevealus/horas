import { AccountModel } from "./account.model";
import { Column, CreateDateColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export class LogLoginModel {
    @PrimaryGeneratedColumn('increment')
    id: number

    @ManyToOne(() => AccountModel, account => account.uid)
    user: AccountModel

    @Column({ type: 'text' })
    log_meta: string

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    logged_at: Date
}