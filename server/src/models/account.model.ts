import { regex } from '@/utilities/regex.pattern'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import * as bcrypt from 'bcrypt'
import { IsString, Matches, ValidateNested } from 'class-validator'
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
import { AccountAuthorityModel } from './account.authority.model'

@Entity({ name: 'account' })
export class AccountModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column({ nullable: false, type: 'uuid', primary: true, unique: true })
  uid: string

  @ApiProperty({
    example: 'example@domain.com',
  })
  @IsString()
  @Matches(regex.email())
  @Column({ nullable: false, type: 'character varying' })
  email: string

  @ApiProperty({
    example: 'John',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying' })
  first_name: string

  @ApiProperty({
    example: 'Doe',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying' })
  last_name: string

  @ApiProperty({
    type: AccountAuthorityModel,
  })
  @ValidateNested()
  @IsString()
  @ManyToOne(() => AccountAuthorityModel, (authority) => authority.uid)
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

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
