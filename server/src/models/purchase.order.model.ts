import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  PrimaryColumn,
  Generated,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { IsDate, IsNumber, IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { AccountModel } from './account.model'
import { MasterSupplierModel } from './master.supplier.model'
import { ColumnNumericTransformer } from '@/utilities/class.transformer.postgres'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'purchase_order' })
export class PurchaseOrderModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Auto generated code',
  })
  code: string

  @ApiProperty({
    example: '',
    type: MasterSupplierModel,
    description: 'Supplier who provide items',
  })
  @ValidateNested()
  @ManyToOne(() => MasterSupplierModel, (foreign) => foreign.id)
  supplier: number

  @ApiProperty({
    example: Date.now(),
    description:
      'Order time. You can specify order time not the same with current time',
  })
  @IsDate()
  @Column({
    nullable: false,
    type: 'timestamp without time zone',
    comment:
      'Order time. You can specify order time not the same with current time',
  })
  order_date: Date

  @ApiProperty({
    example: Date.now(),
    description: 'Est. when to arrival',
    required: false,
  })
  @IsDate()
  @Column({
    nullable: false,
    type: 'timestamp without time zone',
    comment: 'Est. when to arrival',
  })
  arrival_estimation: Date

  @ApiProperty({
    example: Date.now(),
    description: 'Est. when to delivery',
    required: false,
  })
  @IsDate()
  @Column({
    nullable: false,
    type: 'timestamp without time zone',
    comment: 'Est. when to delivery',
  })
  delivery_plan: Date

  @ApiProperty({
    example: Date.now(),
    description: 'Est. when to arrival',
    required: false,
  })
  @IsDate()
  @Column({
    nullable: false,
    type: 'timestamp without time zone',
    comment: 'Est. when to arrival',
  })
  payment_code: Date

  @ApiProperty({
    example: 'xxxx/xx/xxxx-xxx',
    description: 'Supplier invoice number if exists',
    required: false,
  })
  @IsString()
  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Supplier invoice number if exists',
  })
  invoice_number: string

  @ApiProperty({
    example: Date.now(),
    description: 'Invoice date. When it will charged',
  })
  @IsDate()
  @Column({
    nullable: false,
    type: 'timestamp without time zone',
    comment: 'Invoice date. When it will charged',
  })
  invoice_date: Date

  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  total_charge: number

  @ApiProperty({
    example: 43.1,
    type: Number,
    description:
      'Discount value, let it zero if there is no discount. So stingy supplier',
  })
  @IsNumber()
  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  discount: number

  @ApiProperty({
    example: 'percentage',
    type: String,
    enum: ['percentage', 'amount'],
    description: 'Discount type',
  })
  @IsString()
  @Column({
    type: 'enum',
    enum: ['percentage', 'amount'],
    default: 'percentage',
    comment: 'percentage, amount',
  })
  discount_type: string

  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  total_final: number

  @ApiProperty({
    example: 'Just remark to describe something',
    required: false,
  })
  @IsString()
  @Column(properties.remark)
  remark: string

  @ApiProperty({
    example: '',
    type: AccountModel,
    description: 'Account who create purchase order',
  })
  @ValidateNested()
  @ManyToOne(() => AccountModel, (foreign) => foreign.id)
  created_by: AccountModel

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
