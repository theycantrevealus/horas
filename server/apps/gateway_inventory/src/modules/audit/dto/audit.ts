import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { IStockAuditDetailDTO } from '@schemas/inventory/audit.detail.interface'
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

import { CStockAuditDetail } from './audit.detail'

export class StockAuditAddDTO {
  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Mutation date',
  })
  @IsNotEmpty()
  period_from: Date

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Mutation date',
  })
  @IsNotEmpty()
  period_to: Date

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
    description: 'Mutation date',
  })
  @IsNotEmpty()
  transaction_date: Date

  @ApiProperty({
    type: CMasterStockPoint,
    description: 'Stock Point Origin',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CStockAuditDetail,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockAuditDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: IStockAuditDetailDTO[]

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

export class StockAuditEditDTO {
  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Mutation date',
  })
  @IsNotEmpty()
  period_from: Date

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Mutation date',
  })
  @IsNotEmpty()
  period_to: Date

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
    description: 'Mutation date',
  })
  @IsNotEmpty()
  transaction_date: Date

  @ApiProperty({
    type: CMasterStockPoint,
    description: 'Stock Point Origin',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CStockAuditDetail,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockAuditDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: IStockAuditDetailDTO[]

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
