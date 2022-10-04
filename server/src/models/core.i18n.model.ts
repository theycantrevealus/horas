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
  JoinColumn,
  ManyToOne,
  OneToMany,
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
    unique: true,
    nullable: false,
    type: 'character varying',
    comment: 'Country language code 2 digits',
    length: 2,
  })
  language_code: string

  @Column({
    unique: true,
    nullable: false,
    type: 'character varying',
    comment: 'Country code 2 digits',
    length: 2,
  })
  iso_2_digits: string

  @Column({
    unique: true,
    nullable: false,
    type: 'character varying',
    comment: 'Country code 3 digits',
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

  @Type(() => Corei18nComponentModel)
  @OneToMany(() => Corei18nComponentModel, (component) => component.language)
  @JoinColumn()
  components: Corei18nComponentModel[]

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date

  constructor(data: any) {
    this.name = data?.name
    this.language_code = data?.language_code
    this.iso_2_digits = data?.iso_2_digits
    this.iso_3_digits = data?.iso_3_digits
    this.datetime_weekday = data?.datetime_weekday
    this.datetime_era = data?.datetime_era
    this.datetime_year = data?.datetime_year
    this.datetime_month = data?.datetime_month
    this.datetime_day = data?.datetime_day
    this.datetime_hour = data?.datetime_hour
    this.datetime_minute = data?.datetime_minute
    this.datetime_second = data?.datetime_second
    this.datetime_timezone_name = data?.datetime_timezone_name
    this.components = data?.components
  }
}
