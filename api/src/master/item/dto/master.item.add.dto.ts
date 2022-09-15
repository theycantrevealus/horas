import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MasterItemAddDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'xxx-xxx-xxx-xxx',
  })
  @IsString()
  code: string

  @ApiProperty({
    example: 'Paracetamol',
  })
  @IsString()
  name: string

  @ApiProperty({
    example: 'Item detailed description',
  })
  @IsString()
  remark: string
}

export class MasterItemAddDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Item Added Successfully' })
  @IsString()
  message: string

  returning: any
}
