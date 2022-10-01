import { properties } from '@/utilities/models/column'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
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

@Entity({ name: 'core_i18n' })
export class Corei18nModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @ApiProperty({
    example: 'Indonesia',
    type: String,
    description: 'Language name',
  })
  @IsString()
  @IsNotEmpty()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Language Name',
  })
  name: string

  @ApiProperty({
    example: 'ID',
    type: String,
    description: 'ISO 2 digits language code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2)
  @Transform((e) => e.value.toUpperCase())
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Language Name',
    length: 2,
  })
  iso_2_digits: string

  @ApiProperty({
    example: 'IDN',
    type: String,
    description: 'ISO 3 digits language code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3)
  @Transform((e) => e.value.toUpperCase())
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Language Name',
    length: 3,
  })
  iso_3_digits: string

  @ApiProperty({
    example: 'short',
    enum: ['narrow', 'short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['narrow', 'short', 'long'],
    default: 'short',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_weekday: string

  @ApiProperty({
    example: 'short',
    enum: ['narrow', 'short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['narrow', 'short', 'long'],
    default: 'short',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_era: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_year: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit', 'narrow', 'short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit', 'narrow', 'short', 'long'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_month: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_day: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_hour: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_minute: string

  @ApiProperty({
    example: 'numeric',
    enum: ['numeric', '2-digit'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
  @Column({
    nullable: false,
    type: 'enum',
    enum: ['numeric', '2-digit'],
    default: 'numeric',
    comment:
      'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat',
  })
  datetime_second: string

  @ApiProperty({
    example: 'short',
    enum: ['short', 'long'],
    type: String,
    description: `You can define named datetime format (e.g. short, long, etc), and you need to use <a href='https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'>the options with ECMA-402 Intl.DateTimeFormat</a>`,
  })
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
