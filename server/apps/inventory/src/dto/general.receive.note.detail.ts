import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { ApiProperty } from '@nestjs/swagger'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { Type } from 'class-transformer'
import { IsNotEmpty, ValidateNested } from 'class-validator'

export class CGeneralReceiveNoteDetail {
  @ApiProperty({
    type: CMasterItem,
    required: true,
  })
  @Type(() => CMasterItem)
  @ValidateNested({
    each: true,
  })
  item: IMasterItem

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty: number

  @ApiProperty({
    type: String,
    example: 'XXXXX',
  })
  batch: string

  @ApiProperty({
    type: String,
    example: 'XXXXX',
    required: false,
    description: 'Storing label to tracking',
  })
  storing_label: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Expired date',
  })
  @IsNotEmpty()
  expired_date: Date

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
