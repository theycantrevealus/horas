import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'menu_permission' })
export class CoreMenuPermissionModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => CoreMenuModel, (menu) => menu.id)
  menu: CoreMenuModel

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
