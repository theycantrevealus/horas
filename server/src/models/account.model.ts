import { regex } from '@/utilities/regex.pattern'
import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import * as bcrypt from 'bcrypt'
import { IsNumber, IsString, Matches } from 'class-validator'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AccountAuthorityModel } from './account.authority.model'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'account' })
export class AccountModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ApiProperty({
    example: 'example@domain.com',
    description: 'Account email will used for login',
  })
  @IsString()
  @Matches(regex.email())
  @Column({
    nullable: false,
    unique: true,
    type: 'character varying',
    comment: 'Account email will used for login',
  })
  email: string

  @ApiProperty({
    example: 'John',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying', comment: 'John' })
  first_name: string

  @ApiProperty({
    example: 'Doe',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying', comment: 'Doe' })
  last_name: string

  @ApiProperty({
    type: AccountAuthorityModel,
  })
  @IsNumber()
  @Type(() => AccountAuthorityModel)
  @ManyToOne(() => AccountAuthorityModel, (authority) => authority.id)
  authority: AccountAuthorityModel

  @ApiProperty({
    example: 'Doe',
    minLength: 8,
    maxLength: 16,
  })
  @IsString()
  @Transform((e) => bcrypt.hash(e, 10))
  @Column({ nullable: false, type: 'character varying' })
  password: string

  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
