import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber } from 'class-validator'

export class CMasterItemStoring {
  @ApiProperty({
    type: Number,
    description: 'Minimum qty to alert',
  })
  @IsNotEmpty()
  @IsNumber()
  minimum: number

  @ApiProperty({
    type: Number,
    description: 'Maximum qty to alert',
  })
  @IsNotEmpty()
  @IsNumber()
  maximum: number
}
