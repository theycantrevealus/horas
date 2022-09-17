import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    PrimaryGeneratedColumn,
    ManyToOne
} from 'typeorm'
import { MenuModel } from './menu.model'

@Entity({ name: 'menu_group' })
export class MenuGroupModel {
    @PrimaryGeneratedColumn('increment')
    id: number

    @Column({ nullable: false, type: 'character varying' })
    name: string

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    created_at: Date

    @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    updated_at: Date

    @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
    deleted_at: Date
}
