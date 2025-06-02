import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CMasterItemConfiguration {
  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_sell: boolean

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

  @ApiProperty({
    enum: ['n', 'p', 'v'],
    default: 'n',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  benefit_margin_type: string

  @ApiProperty({
    default: 0,
    type: Number,
    description: '',
  })
  @IsNotEmpty()
  @IsNumber()
  benefit_margin_value: number
}
