import {
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  Column,
  Generated,
  PrimaryColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsString, ValidateNested } from 'class-validator'
import { MasterSupplierModel } from './master.supplier.model'
import { PurchaseOrderModel } from './purchase.order.model'
import { AccountModel } from './account.model'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'good_receipt_note' })
export class GoodReceiptNoteModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column(properties.uid)
  uid: string

  @Column({
    nullable: false,
    type: 'character varying',
    comment: 'Auto generated code',
  })
  code: string

  @ApiProperty({
    example: 'xxxxxxxx',
    description: 'GRN code from courier',
    required: false,
  })
  @IsString()
  @Column({ type: 'text', comment: 'GRN that followed by courier' })
  grn_number: string

  @ApiProperty({
    example: 'John Doe',
    description: 'Delivered by who?',
  })
  @IsString()
  @Column({ type: 'character varying', comment: 'Courier name' })
  courier_name: string

  @ApiProperty({
    example: Date.now(),
    description:
      'Arrival date. You can specify delivery date not the same with current time',
  })
  @IsDate()
  @Column({
    nullable: false,
    type: 'timestamp without time zone',
    comment: 'When packages arrived',
  })
  arrival_time: Date

  @ApiProperty({
    example: '',
    type: MasterSupplierModel,
    description: 'Supplier who provide items',
  })
  @ValidateNested()
  @ManyToOne(() => MasterSupplierModel, (foreign) => foreign.uid)
  supplier: string

  @ApiProperty({
    example: '',
    type: PurchaseOrderModel,
    required: false,
    description: 'If item ordered by specific purchase order',
  })
  @ValidateNested()
  @ManyToOne(() => PurchaseOrderModel, (foreign) => foreign.uid)
  purchase_order: string

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
  @ManyToOne(() => AccountModel, (foreign) => foreign.uid)
  created_by: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
