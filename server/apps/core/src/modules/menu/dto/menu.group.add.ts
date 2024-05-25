import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber } from 'class-validator'
import { Types } from 'mongoose'

export class MenuGroupAddDTO {
  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  name: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  description: string
}

export class MenuGroupEditDTO {
  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  name: string

  @ApiProperty({
    type: String,
    example: '',
    description: 'Menu group name',
  })
  description: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}

export class CMenuGroup {
  @ApiProperty({
    type: String,
    example: `menu_group-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'Menu Group Name',
  })
  name: string
}
