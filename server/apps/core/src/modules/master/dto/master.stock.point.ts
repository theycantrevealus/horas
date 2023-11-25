import { IMasterStockPointConfiguration } from '@core/master/interface/master.stock.point.configuration'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Types } from 'mongoose'

export class CMasterStockPointConfiguration {
  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_grn: boolean

  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_incoming: boolean

  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_outgoing: boolean

  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_destruction: boolean
}

export class CMasterStockPoint {
  @ApiProperty({
    type: String,
    example: `stock_point-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Drugs',
  })
  name: string
}

export class MasterStockPointAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item brand',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Main Storage',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    type: CMasterStockPointConfiguration,
    description: 'Stock point configuration',
  })
  @IsNotEmpty()
  configuration: IMasterStockPointConfiguration

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string
}

export class MasterStockPointEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item brand',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Main Storage',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    type: CMasterStockPointConfiguration,
    description: 'Stock point configuration',
  })
  @IsNotEmpty()
  configuration: IMasterStockPointConfiguration

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    example: 0,
    description: 'Item brand document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
