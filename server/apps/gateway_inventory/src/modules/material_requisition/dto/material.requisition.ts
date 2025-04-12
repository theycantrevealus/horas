import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { IMaterialRequisitionDetail } from '@schemas/inventory/material.requisition.detail.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { CMaterialRequisitionDetail } from './material.requisition.detail'

export class CMaterialRequisition {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code. Left it blank so it will generate auto code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  id: string

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
    description: 'Material requisition date',
  })
  @IsNotEmpty()
  transaction_date: Date
}

export class MaterialRequisitionAddDTO {
  // @ApiProperty({
  //   type: CLocale,
  //   description: 'Locale',
  // })
  // @IsNotEmpty()
  // @Type(() => CLocale)
  // @ValidateNested({ each: true })
  // locale: ILocale

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
    description: 'Material requisition date',
  })
  @IsNotEmpty()
  transaction_date: Date

  @ApiProperty({
    type: CMasterStockPoint,
    description: 'Requester stock point',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CMaterialRequisitionDetail,
    isArray: true,
    description: 'Material requisition item(s)',
  })
  @Type(() => CMaterialRequisitionDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: IMaterialRequisitionDetail[]

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
  })
  @IsNotEmpty()
  remark: string
}

export class MaterialRequisitionEditDTO {
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
    description: 'Material requisition date',
  })
  @IsNotEmpty()
  transaction_date: Date

  @ApiProperty({
    type: CMaterialRequisitionDetail,
    isArray: true,
    description: 'Material requisition item(s)',
  })
  @Type(() => CMaterialRequisitionDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: IMaterialRequisitionDetail[]

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
  })
  @IsNotEmpty()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
