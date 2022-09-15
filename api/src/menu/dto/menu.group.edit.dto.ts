import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MenuGroupEditDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'Menu Group Name',
  })
  @IsString()
  name: string
}

export class MenuGroupEditResponseDTO {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Menu Group Updated Successfully' })
  @IsString()
  message: string

  returning: any
}
