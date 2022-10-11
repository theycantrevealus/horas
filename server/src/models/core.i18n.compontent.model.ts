import { properties } from '@/utilities/models/column'
import { Type } from 'class-transformer'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Corei18nModel } from './core.i18n.model'
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'core_i18n_component' })
export class Corei18nComponentModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Type(() => CoreMenuModel)
  @ManyToOne(() => CoreMenuModel, (menu) => menu.id, {
    orphanedRowAction: 'delete',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'menu_id' })
  menu: CoreMenuModel

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Component Identifier',
  })
  component: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Translation value',
  })
  translation: string

  @Type(() => Corei18nModel)
  @ManyToOne(() => Corei18nModel, (i18n) => i18n.components, {
    orphanedRowAction: 'delete',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'language_id' })
  language: Corei18nModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date

  constructor(data: any) {
    this.menu = data?.menu
    this.component = data?.component
    this.translation = data?.translation
    this.language = data?.language
  }
}
