import { ApiProperty } from '@nestjs/swagger'
import { IPurchaseRequisitionDetail } from '@schemas/inventory/purchase.requisition.detail.interface'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { CPurchaseRequisitionDetail } from './purchase.requisition.detail'

export class PurchaseRequisitionAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    required: false,
    description: 'Unique code. Left it blank so it will generate auto code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code?: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Actual date',
  })
  @IsNotEmpty()
  transaction_date: Date

  @ApiProperty({
    example: 'material_requisition-xxxxx',
    description: 'Material requisition target',
  })
  @IsNotEmpty()
  material_requisition: string

  @ApiProperty({
    type: CPurchaseRequisitionDetail,
    description: 'Locale',
    isArray: true,
  })
  @IsNotEmpty()
  @IsArray()
  @Type(() => CPurchaseRequisitionDetail)
  @ValidateNested({ each: true })
  detail: IPurchaseRequisitionDetail[]

  @ApiProperty({
    example: '',
    description: 'Any extra object',
    required: false,
  })
  @IsOptional()
  extras: any

  @ApiProperty({
    example: 'Extra description',
    description: '',
    required: false,
  })
  remark: string
}

export class PurchaseRequisitionEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code. Left it blank so it will generate auto code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Actual date',
  })
  @IsNotEmpty()
  transaction_date: Date

  @ApiProperty({
    example: 'material_requisition-xxxxx',
    description: 'Material requisition target',
  })
  @IsNotEmpty()
  material_requisition: string

  @ApiProperty({
    type: CPurchaseRequisitionDetail,
    description: 'Locale',
    isArray: true,
  })
  @IsNotEmpty()
  @IsArray()
  @Type(() => CPurchaseRequisitionDetail)
  @ValidateNested({ each: true })
  detail: IPurchaseRequisitionDetail[]

  @ApiProperty({
    example: '',
    description: 'Any extra object',
    required: false,
  })
  @IsOptional()
  extras: any

  @ApiProperty({
    example: 'Extra description',
    description: '',
    required: false,
  })
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
