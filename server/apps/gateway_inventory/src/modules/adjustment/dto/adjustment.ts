import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { IStockAdjustmentDetail } from '@schemas/inventory/adjustment.detail.interface'
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

import { CStockAdjustmentDetailDTO } from './adjustment.detail'

export class StockAdjustmentAddDTO {
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
    type: CMasterStockPoint,
    description: 'Stock Point',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CStockAdjustmentDetailDTO,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockAdjustmentDetailDTO)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: IStockAdjustmentDetail[]

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

export class StockAdjustmentEditDTO {
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
    type: CMasterStockPoint,
    description: 'Stock Point',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CStockAdjustmentDetailDTO,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockAdjustmentDetailDTO)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: IStockAdjustmentDetail[]

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
