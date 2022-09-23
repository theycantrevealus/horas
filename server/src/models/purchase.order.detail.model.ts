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
import { properties } from '@/utilities/models/column'

@Entity({ name: 'purchase_order_detail' })
export class PurchaseOrderDetailModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ManyToOne(() => PurchaseOrderModel, (foreign) => foreign.uid)
  purchase_order: string

  @ApiProperty({
    example: '',
    type: MasterItemModel,
    description: 'Item to purchase',
  })
  @ValidateNested()
  @ManyToOne(() => MasterItemModel, (foreign) => foreign.uid)
  item: string

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
  @ManyToOne(() => MasterItemUnitModel, (foreign) => foreign.uid)
  unit: string

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
    comment: 'Discount type : percentage, amount',
  })
  discount_type: string

  @Column('numeric', {
    precision: 7,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  total_final: number

  @ApiProperty({
    example: '',
    type: MasterItemModel,
    description: 'Item to purchase',
  })
  @Column({
    type: 'enum',
    enum: ['new', 'progress'],
    default: 'new',
    comment: 'new, progress',
  })
  status: string

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
