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
import { PurchaseOrderModel } from './purchase.order.model'
import { MasterItemModel } from './master.item.model'
import { MasterItemUnitModel } from './master.item.unit.model'
import { GoodReceiptNoteModel } from './good.receipt.note.model'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'good_receipt_note_detail' })
export class GoodReceiptNoteOrderDetailModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => GoodReceiptNoteModel, (foreign) => foreign.id)
  good_receipt_note: GoodReceiptNoteModel

  @ApiProperty({
    example: '',
    type: MasterItemModel,
    description: 'Item delivered',
  })
  @ValidateNested()
  @ManyToOne(() => MasterItemModel, (foreign) => foreign.id)
  item: MasterItemModel

  @ApiProperty({
    example: 10,
    type: Number,
    description: 'Quantity per item',
  })
  @IsNumber()
  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  qty: number

  @ApiProperty({
    example: '',
    type: MasterItemUnitModel,
    description: 'Item unit',
  })
  @ValidateNested()
  @ManyToOne(() => MasterItemUnitModel, (foreign) => foreign.id)
  unit: MasterItemUnitModel

  @ApiProperty({
    example: 'xxxxx',
    type: String,
    required: false,
    description: 'Batch code',
  })
  @Column({
    type: 'character varying',
    comment: 'Batch Code',
  })
  batch_code: string

  @ApiProperty({
    example: Date.now(),
    type: Date,
    required: false,
    description: 'When it will expired',
  })
  @IsDate()
  @Column({
    nullable: true,
    type: 'timestamp without time zone',
    comment: 'Item expired',
  })
  expired_date: Date

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
