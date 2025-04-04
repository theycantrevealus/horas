import { CLOV } from '@gateway_core/lov/dto/lov'
import { CMasterItemBrand } from '@gateway_core/master/dto/master.item.brand'
import { CMasterItemCategory } from '@gateway_core/master/dto/master.item.category'
import { CMasterItemConfiguration } from '@gateway_core/master/dto/master.item.configuration'
import { CMasterItemStoring } from '@gateway_core/master/dto/master.item.storing'
import { CMasterItemUnit } from '@gateway_core/master/dto/master.item.unit'
import { ApiProperty } from '@nestjs/swagger'
import { ILOV } from '@schemas/lov/lov.interface'
import { IMasterItemBrand } from '@schemas/master/master.item.brand.interface'
import { IMasterItemCategory } from '@schemas/master/master.item.category.interface'
import { IMasterItemConfiguration } from '@schemas/master/master.item.configuration.interface'
import { IMasterItemStoring } from '@schemas/master/master.item.storing.interface'
import { IMasterItemUnit } from '@schemas/master/master.item.unit.interface'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Types } from 'mongoose'

export class CMasterItem {
  @ApiProperty({
    type: String,
    example: `item-${new Types.ObjectId().toString()}`,
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

  @ApiProperty({
    type: CMasterItemBrand,
  })
  @IsNotEmpty()
  brand: IMasterItemBrand
}

export class MasterItemAddDTO {
  @ApiProperty({
    type: String,
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    example: 'Adidas',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Adidas ALias',
    description: 'Item alias name',
    required: false,
  })
  @IsOptional()
  @IsString()
  alias?: string

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
  category: IMasterItemCategory[]

  @ApiProperty({
    type: CMasterItemUnit,
  })
  @IsNotEmpty()
  unit: IMasterItemUnit

  @ApiProperty({
    type: CMasterItemBrand,
  })
  @IsNotEmpty()
  brand: IMasterItemBrand

  @ApiProperty({
    required: false,
    example: {},
  })
  structure: any

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Stock point configuration',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  properties: ILOV[]

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string
}

export class MasterItemEditDTO {
  @ApiProperty({
    type: String,
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of item',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    example: 'Adidas',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Adidas ALias',
    description: 'Item alias name',
    required: false,
  })
  @IsOptional()
  @IsString()
  alias?: string

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
  category: IMasterItemCategory[]

  @ApiProperty({
    type: CMasterItemUnit,
  })
  @IsNotEmpty()
  unit: IMasterItemUnit

  @ApiProperty({
    type: CMasterItemBrand,
  })
  @IsNotEmpty()
  brand: IMasterItemBrand

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Stock point configuration',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  properties: ILOV[]

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
