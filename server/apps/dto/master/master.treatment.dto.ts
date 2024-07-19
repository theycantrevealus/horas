import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class CMasterTreatment {
  @ApiProperty({
    type: String,
    required: true,
    example: '',
  })
  @IsNotEmpty()
  id: string

  @ApiProperty({
    type: String,
    example: '',
  })
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    example: '',
  })
  @IsNotEmpty()
  name: string
}
