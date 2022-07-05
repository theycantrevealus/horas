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
import { MasterItemModel } from './master.item.model'

@Entity({ name: 'master_x_item_alias' })
export class MasterXItemAliasModel {
    @PrimaryGeneratedColumn('increment')
    id: number

    @ManyToOne(() => MasterItemModel, item => item.uid)
    item: MasterItemModel

    @Column({ nullable: false, type: 'character varying' })
    name: string

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    created_at: Date

    @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    updated_at: Date

    @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
    deleted_at: Date
}
