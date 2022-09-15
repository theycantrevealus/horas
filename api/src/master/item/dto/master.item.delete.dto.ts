import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MasterItemDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Item Deleted Successfully' })
  @IsString()
  message: string

  returning: any
}
