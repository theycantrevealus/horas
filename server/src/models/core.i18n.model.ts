import { properties } from '@/utilities/models/column'
import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
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
} from 'typeorm'
import { Corei18nComponentModel } from './core.i18n.compontent.model'

@Entity({ name: 'core_i18n' })
export class Corei18nModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Language Name',
  })
  name: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Language Name',
    length: 2,
  })
  iso_2_digits: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Language Name',
    length: 3,
  })
  iso_3_digits: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['narrow', 'short', 'long'],
    default: 'short',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_weekday: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['narrow', 'short', 'long'],
    default: 'short',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_era: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_year: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit', 'narrow', 'short', 'long'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_month: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_day: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_hour: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_minute: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_second: string

  @Column({
    nullable: false,
    type: 'enum',
    enum: ['short', 'long'],
    default: 'short',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_timezone_name: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
