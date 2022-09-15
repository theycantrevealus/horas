import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MenuGroupAddDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'Menu Group Name',
  })
  @IsString()
  name: string
}

export class MenuGroupAddResponseDTO {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'Menu Group Created Successfully' })
  @IsString()
  message: string

  returning: any
}
