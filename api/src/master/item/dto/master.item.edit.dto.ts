import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MasterItemEditDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'xxx-xxx-xxx-xxx',
  })
  @IsString()
  code: string

  @ApiProperty({
    example: 'Paracetamol'
  })
  @IsString()
  name: string

  @ApiProperty({
    example: 'Item detailed description'
  })
  @IsString()
  remark: string
}

export class MasterItemEditDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Item Updated Successfully' })
  @IsString()
  message: string

  returning: any
}
