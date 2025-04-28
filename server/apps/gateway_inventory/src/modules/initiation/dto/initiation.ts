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

import { CStockInitiationDetail } from './initiation.detail'

/**
 * @class StockInitiationAddDTO
 * @description Whether or not to auto-import master items on stock initialization depends on your specific business requirements and inventory management processes.
 * Pros of Auto-Importing
 * 1. Streamlined process: Auto-importing master items can streamline the stock initialization process, reducing manual effort and minimizing errors.
 * 2. Faster setup: Auto-importing can help set up inventory records quickly, allowing businesses to start tracking inventory levels and managing stock more efficiently.
 *
 * Cons of Auto-Importing
 * 1. Data accuracy: Auto-importing master items may lead to data accuracy issues if the imported data is incorrect or incomplete.
 * 2. Data validation: Auto-importing may bypass data validation checks, potentially leading to inconsistencies in inventory records.
 *
 * When to Auto-Import
 * 1. Large inventory: Auto-importing may be beneficial when dealing with a large inventory of master items.
 * 2. Existing data: If master item data already exists in another system, auto-importing can help leverage that data.
 *
 * When Not to Auto-Import
 * 1. Critical data: If master item data is critical or sensitive, manual review and validation may be necessary to ensure accuracy.
 * 2. Complex inventory: If inventory management processes are complex or require specific customization, manual setup may be more suitable.
 */
export class StockInitiationAddDTO {
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
    type: CStockInitiationDetail,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockInitiationDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CStockInitiationDetail[]

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

export class StockInitiationEditDTO {
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
    type: CStockInitiationDetail,
    isArray: true,
    description: 'Mutation item(s)',
  })
  @Type(() => CStockInitiationDetail)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  detail: CStockInitiationDetail[]

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
