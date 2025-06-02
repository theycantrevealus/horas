import { CLOV } from '@gateway_core/lov/dto/lov'
import { CMasterItemCategory } from '@gateway_core/master/dto/master.item.category'
import { CMasterItemConfiguration } from '@gateway_core/master/dto/master.item.configuration'
import { CMasterItemUnit } from '@gateway_core/master/dto/master.item.unit'
import { ApiProperty } from '@nestjs/swagger'
import { ILOV } from '@schemas/lov/lov.interface'
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

  // @ApiProperty({
  //   type: CMasterItemBrand,
  // })
  // @IsNotEmpty()
  // brand: CMasterItemBrand
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
  configuration: CMasterItemConfiguration

  // @ApiProperty({
  //   type: CMasterItemStoring,
  //   isArray: true,
  //   required: false,
  //   description: 'Storing configuration',
  // })
  // @IsNotEmpty()
  // storing: IMasterItemStoring[]

  @ApiProperty({
    type: CMasterItemCategory,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @IsNotEmpty()
  category: CMasterItemCategory[]

  @ApiProperty({
    type: CMasterItemUnit,
    isArray: true,
  })
  @IsNotEmpty()
  unit: CMasterItemUnit[]

  // @ApiProperty({
  //   type: CMasterItemBrand,
  // })
  // @IsNotEmpty()
  // brand: CMasterItemBrand

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
    description: 'Item extra remark',
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
  configuration: CMasterItemConfiguration

  // @ApiProperty({
  //   type: CMasterItemStoring,
  //   isArray: true,
  //   required: false,
  //   description: 'Storing configuration',
  // })
  // @IsNotEmpty()
  // storing: IMasterItemStoring[]

  @ApiProperty({
    type: CMasterItemCategory,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @IsNotEmpty()
  category: CMasterItemCategory[]

  @ApiProperty({
    type: CMasterItemUnit,
    isArray: true,
  })
  @IsNotEmpty()
  unit: CMasterItemUnit[]

  // @ApiProperty({
  //   type: CMasterItemBrand,
  // })
  // @IsNotEmpty()
  // brand: CMasterItemBrand

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
    description: 'Item extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    example: 0,
    description: 'Item document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
