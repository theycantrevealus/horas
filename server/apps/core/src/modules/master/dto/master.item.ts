import { CLOV, ILOV } from '@core/lov/schemas/lov.join'
import {
  CMasterItemConfiguration,
  CMasterItemStoring,
  IMasterItemConfiguration,
  IMasterItemStoring,
} from '@core/master/schemas/master.item'
import { MasterItemBrand } from '@core/master/schemas/master.item.brand'
import {
  IMasterItemBrand,
  MasterItemBrandJoin,
} from '@core/master/schemas/master.item.brand.join'
import { MasterItemCategory } from '@core/master/schemas/master.item.category'
import { CMasterItemCategory } from '@core/master/schemas/master.item.category.join'
import { MasterItemUnit } from '@core/master/schemas/master.item.unit'
import {
  IMasterItemUnit,
  MasterItemUnitJoin,
} from '@core/master/schemas/master.item.unit.join'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

export class MasterItemAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Adidas',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Adidas ALias',
    description: 'Item alias name',
  })
  @IsNotEmpty()
  alias: string

  @ApiProperty({
    type: CMasterItemConfiguration,
    description: 'Stock point configuration',
  })
  @IsNotEmpty()
  configuration: IMasterItemConfiguration

  @ApiProperty({
    type: CMasterItemStoring,
    isArray: true,
    required: false,
    description: 'Storing configuration',
  })
  @IsNotEmpty()
  storing: IMasterItemStoring[]

  @ApiProperty({
    type: CMasterItemCategory,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @IsNotEmpty()
  category: CMasterItemCategory[]

  @ApiProperty({
    type: MasterItemUnitJoin,
  })
  @IsNotEmpty()
  unit: IMasterItemUnit

  @ApiProperty({
    type: MasterItemBrandJoin,
  })
  @IsNotEmpty()
  brand: IMasterItemBrand

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Stock point configuration',
  })
  @IsNotEmpty()
  properties: ILOV[]

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
  })
  @IsNotEmpty()
  remark: string

  constructor(parameter: any) {
    this.code = parameter.code
    this.name = parameter.name
    this.category = parameter.category
    this.unit = parameter.unit
    this.brand = parameter.brand
    this.remark = parameter.remark
  }
}

export class MasterItemEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Adidas',
    description: 'Item name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Adidas ALias',
    description: 'Item alias name',
  })
  @IsNotEmpty()
  alias: string

  @ApiProperty({
    type: CMasterItemConfiguration,
    description: 'Stock point configuration',
  })
  @IsNotEmpty()
  configuration: IMasterItemConfiguration

  @ApiProperty({
    type: MasterItemCategory,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @IsNotEmpty()
  category: MasterItemCategory[]

  @ApiProperty({
    type: MasterItemUnit,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @IsNotEmpty()
  unit: MasterItemUnit[]

  @ApiProperty({
    type: MasterItemBrand,
  })
  @IsNotEmpty()
  brand: MasterItemBrand

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Stock point configuration',
  })
  @IsNotEmpty()
  properties: ILOV[]

  @ApiProperty({
    type: CMasterItemStoring,
    isArray: true,
    required: false,
    description: 'Storing configuration',
  })
  @IsNotEmpty()
  storing: IMasterItemStoring[]

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
  })
  @IsNotEmpty()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Item brand document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number

  constructor(parameter: any) {
    this.code = parameter.code
    this.name = parameter.name
    this.alias = parameter.alias
    this.category = parameter.category
    this.unit = parameter.unit
    this.brand = parameter.brand
    this.remark = parameter.remark
  }
}
