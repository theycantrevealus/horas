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
} from 'typeorm'
import { Corei18nModel } from './core.i18n.model'
import { CoreMenuModel } from './core.menu.model'

@Entity({ name: 'core_i18n_component' })
export class Corei18nComponentModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @ApiProperty({
    example: '',
    type: Corei18nModel,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Corei18nModel)
  @ManyToOne(() => Corei18nModel, (i18n) => i18n.uid)
  language: Corei18nModel

  @ApiProperty({
    example: '',
    type: CoreMenuModel,
  })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => CoreMenuModel)
  @ManyToOne(() => CoreMenuModel, (menu) => menu.id)
  menu: CoreMenuModel

  @ApiProperty({
    example: 'group.identifier',
    type: String,
    description: 'Component Identifier',
  })
  @IsString()
  @IsNotEmpty()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Component Identifier',
  })
  component: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date

  constructor(language: Corei18nModel, menu: CoreMenuModel, component: string) {
    this.language = language
    this.menu = menu
    this.component = component
  }
}
