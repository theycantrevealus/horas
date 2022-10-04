import { CoreMenuModel } from '@/models/core.menu.model'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class Corei18nComponentDTO {
  @ApiProperty({
    example: 0,
    type: CoreMenuModel,
  })
  @IsNotEmpty()
  menu: CoreMenuModel

  @ApiProperty({
    example: 'group.identifier',
    type: String,
    description: 'Component Identifier',
  })
  @IsNotEmpty()
  component: string

  @ApiProperty({
    example: 'group.identifier',
    type: String,
    description: 'Component Identifier',
  })
  @IsNotEmpty()
  language: string

  @ApiProperty({
    example: 'Hello There',
    type: String,
    description: 'Translation value',
  })
  @IsString()
  @IsNotEmpty()
  translation: string
}
