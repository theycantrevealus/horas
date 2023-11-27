import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty } from 'class-validator'

export class CMasterItemConfiguration {
  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_sell: boolean
}
