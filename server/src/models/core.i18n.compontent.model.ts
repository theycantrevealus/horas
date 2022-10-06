import { properties } from '@/utilities/models/column'
import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AccountModel } from './account.model'
import { Corei18nModel } from './core.i18n.model'
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'core_i18n_component' })
export class Corei18nComponentModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Type(() => CoreMenuModel)
  @ManyToOne(() => CoreMenuModel, (menu) => menu.id)
  @JoinColumn()
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
  @ManyToOne(() => Corei18nModel, (i18n) => i18n.components)
  @JoinColumn({ name: 'language_uid' })
  language: Corei18nModel

  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

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
