import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MasterItemAliasEditDTO {
  @ApiProperty({
    example: 'Paracetamol'
  })
  @IsString()
  name: string
}

export class MasterItemAliasEditDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Item Alias Edited Successfully' })
  @IsString()
  message: string

  returning: any
}
