import { raw } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export const LOVJoin = raw({
  id: { type: String },
  name: { type: String },
  value: { type: String },
})

export interface ILOV {
  id: string
  name: string
  value: string
}

export class CLOV {
  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  id: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  name: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  value: string
}
