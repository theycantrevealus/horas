import {
    Entity,
    Column,
    PrimaryColumn,
    Generated,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
} from 'typeorm'

@Entity({ name: 'master_item_category' })
export class MasterItemCategoryModel {
    @PrimaryColumn()
    @Generated('uuid')
    @Column({ nullable: false, type: 'uuid', primary: true })
    uid: string

    @Column({ nullable: false, unique: true, type: 'character varying' })
    code: string

    @Column({ nullable: false, type: 'character varying' })
    name: string

    @Column({ type: 'text' })
    remark: string

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    created_at: Date

    @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    updated_at: Date

    @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
    deleted_at: Date
}
