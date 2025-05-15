import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { CMasterItemUnit } from '@gateway_core/master/dto/master.item.unit'
import { ApiProperty } from '@nestjs/swagger'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { IMasterItemUnit } from '@schemas/master/master.item.unit.interface'

export class CMaterialRequisitionDetail {
  @ApiProperty({
    type: CMasterItem,
    required: true,
  })
  item: IMasterItem

  @ApiProperty({
    type: Number,
    example: 10,
  })
  qty: number

  @ApiProperty({
    type: CMasterItemUnit,
    required: true,
  })
  unit: IMasterItemUnit

  @ApiProperty({
    type: String,
    example: '',
  })
  remark: string
}
