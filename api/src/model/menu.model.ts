import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    PrimaryGeneratedColumn
} from 'typeorm'

@Entity({ name: 'menu' })
export class MenuModel {
    @PrimaryGeneratedColumn('increment')
    id: number

    @Column({ nullable: false, type: 'character varying' })
    name: string

    @Column({ nullable: false, type: 'character varying' })
    identifier: string

    @Column({ type: 'integer' })
    parent: number

    @Column({ nullable: false, type: 'character varying' })
    icon: string

    @Column({ nullable: false, type: 'char', length: 1 })
    show_on_menu: string

    @Column({ type: 'integer' })
    show_order: number

    @Column({ type: 'integer' })
    menu_group: number

    @Column({ type: 'integer' })
    level: number

    @Column({ type: 'character varying' })
    group_color: string

    @Column({ type: 'text' })
    remark: string

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    created_at: Date

    @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    updated_at: Date

    @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
    deleted_at: Date
}
