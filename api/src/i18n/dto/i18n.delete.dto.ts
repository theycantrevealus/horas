import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNumber } from 'class-validator'

export class I18nDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'i18n deleted successfully' })
  @IsString()
  message: string

  returning: any
}