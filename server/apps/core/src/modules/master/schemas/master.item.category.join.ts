import { raw } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Types } from 'mongoose'

export const MasterItemCategoryJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export interface IMasterItemCategory {
  id: string
  code: string
  name: string
}

export class CMasterItemCategory {
  @ApiProperty({
    type: String,
    example: `category-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Drugs',
  })
  name: string
}
