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
import { MasterItemCategoryModel } from './master.item.category.model'
import { MasterItemModel } from './master.item.model'

@Entity({ name: 'master_x_item_category' })
export class MasterXItemCategoryModel {
    @PrimaryGeneratedColumn('increment')
    id: number

    @ManyToOne(() => MasterItemModel, item => item.uid)
    item: MasterItemModel

    @ManyToOne(() => MasterItemCategoryModel, category => category.uid)
    category: MasterItemCategoryModel

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    created_at: Date

    @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    updated_at: Date

    @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
    deleted_at: Date
}
