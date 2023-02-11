import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, MaxLength, MinLength } from 'class-validator'

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
  })
  @IsNotEmpty()
  remark: string
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
  })
  @IsNotEmpty()
  remark: string

  @IsNotEmpty()
  @IsNumber()
  __v: number
}
