import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, ValidateNested } from 'class-validator'

export class Ci18nCurrency {
  @ApiProperty({
    example: 'currency',
    description: '',
  })
  @IsNotEmpty()
  style: string

  @ApiProperty({
    example: 'IDR',
    description: '',
  })
  @IsNotEmpty()
  currency: string

  @ApiProperty({
    example: 'standard',
    description: '',
  })
  @IsNotEmpty()
  notation: string
}

export class Ci18nDecimal {
  @ApiProperty({
    example: 'decimal',
    description: '',
  })
  @IsNotEmpty()
  style: string

  @ApiProperty({
    example: 2,
    description: '',
  })
  @IsNotEmpty()
  maximumFractionDigits: number

  @ApiProperty({
    example: 2,
    description: '',
  })
  @IsNotEmpty()
  minimumFractionDigits: number
}

export class Ci18nPercent {
  @ApiProperty({
    example: 'percent',
    description: '',
  })
  @IsNotEmpty()
  style: string

  @ApiProperty({
    example: false,
    description: '',
  })
  @IsNotEmpty()
  useGrouping: boolean
}

export class Ci18nNumber {
  @ApiProperty({
    type: Ci18nCurrency,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  currency: Ci18nCurrency

  @ApiProperty({
    type: Ci18nDecimal,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  decimal: Ci18nDecimal

  @ApiProperty({
    type: Ci18nPercent,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  percent: Ci18nPercent
}
