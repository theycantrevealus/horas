import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
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

import { CStockDisposalDetail } from './disposal.detail'

export class StockDisposalAddDTO {
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
    type: CMasterStockPoint,
    description: 'Stock Point Origin',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CStockDisposalDetail,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockDisposalDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CStockDisposalDetail[]

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

export class StockDisposalEditDTO {
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
    type: CMasterStockPoint,
    description: 'Stock Point Origin',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CStockDisposalDetail,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockDisposalDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CStockDisposalDetail[]

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
