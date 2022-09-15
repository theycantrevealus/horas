import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'
import { MenuModel } from './menu.model'

@Entity({ name: 'menu_permission' })
export class MenuPermissionModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => MenuModel, (menu) => menu.id)
  menu: MenuModel

  @Column({ nullable: false, type: 'character varying' })
  domiden: string

  @Column({ nullable: false, type: 'character varying' })
  dispatchname: string

  @Column({ type: 'character varying' })
  servicegroup: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
