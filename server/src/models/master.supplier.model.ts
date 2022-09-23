import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  PrimaryColumn,
  Generated,
} from 'typeorm'
import { IsNumber, IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'master_supplier' })
export class MasterSupplierModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @ApiProperty({
    example: 'xxx-xxx-xxx',
    description: 'Identity code to identify supplier',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    unique: true,
    comment: 'Auto generated code',
  })
  code: string

  @ApiProperty({
    example: 'Supplier Name Co.Ltd',
    description: 'Supplier name',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Supplier name',
  })
  name: string

  @ApiProperty({
    example: '(Country Code) Number',
    description: 'Phone to contact',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Phone to contact',
  })
  phone_number: string

  @ApiProperty({
    example: '(Country Code) Number',
    description: 'Fax number',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying', comment: 'Fax number' })
  fax_number: string

  @ApiProperty({
    example: 'customer-service@domain.com',
    description: 'Supplier email',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Supplier email',
  })
  email: string

  @ApiProperty({
    example: 'John Doe',
    description: 'Who is people in charge for supplier complain or else',
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Who is people in charge for supplier complain or else',
  })
  pic_name: string

  @ApiProperty({
    example: '13th Avenue, San Andreas, GTA',
    description: 'Address',
  })
  @IsString()
  @Column({ nullable: false, type: 'text', comment: 'Address' })
  address: string

  @ApiProperty({
    example: 'Just remark to describe something',
    required: false,
  })
  @IsString()
  @Column(properties.remark)
  remark: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
