import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class I18nEditDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'IDN',
  })
  @IsString()
  iso_code_3: string

  @ApiProperty({
    example: 'Route name with camel case',
  })
  @IsString()
  route: string

  @ApiProperty({
    example: 'Caption identifier',
  })
  @IsString()
  identifier: string

  @ApiProperty({
    example: 'Caption',
  })
  @IsString()
  caption: string
}

export class I18nEditDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Item Added Successfully' })
  @IsString()
  message: string

  returning: any
}
