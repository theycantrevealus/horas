import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    PrimaryGeneratedColumn,
    ManyToOne
} from 'typeorm'
import { MenuGroupModel } from './menu.group.model'

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

    @ManyToOne(() => MenuGroupModel, menu => menu.id)
    menu_group: MenuGroupModel

    @Column({ nullable: false, type: 'character varying' })
    icon: string

    @Column({ nullable: false, type: 'char', length: 1 })
    show_on_menu: string

    @Column({ type: 'integer' })
    show_order: number

    @Column({ type: 'integer', nullable: true })
    level: number

    @Column({ type: 'character varying', nullable: true })
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
