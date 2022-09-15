import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MasterItemAliasAddDTO {
  @ApiProperty({
    example: 'Paracetamol',
  })
  @IsString()
  name: string

  @ApiProperty({
    example: 'Item UID',
  })
  @IsString()
  item: any
}

export class MasterItemAliasAddDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Item Alias Registered Successfully' })
  @IsString()
  message: string

  returning: any
}
