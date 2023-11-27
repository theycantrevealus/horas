import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Types } from 'mongoose'

export class CMasterItemBrand {
  @ApiProperty({
    type: String,
    example: `brand-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Dumin Rectal',
  })
  name: string
}

export class MasterItemBrandAddDTO {
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
    example: 'Adidas',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Item brand extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string
}

export class MasterItemBrandEditDTO {
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
    example: 'Adidas',
    description: 'Item brand name',
  })
  @IsNotEmpty()
  name: string

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
