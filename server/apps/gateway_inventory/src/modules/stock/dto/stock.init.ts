import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { GeneralItemDetailDTO } from '@gateway_inventory/stock/dto/stock'
import { ApiProperty } from '@nestjs/swagger'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { Type } from 'class-transformer'
import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator'

export class StockInitDTO {
  @ApiProperty({
    type: CMasterStockPoint,
    required: true,
  })
  @IsNotEmpty()
  @Type(() => CMasterStockPoint)
  @ValidateNested()
  stock_point: IMasterStockPoint

  @ApiProperty({
    example: 'xxxxxx',
    description:
      'Custom transaction ID. If not set, will follow system default code generator',
  })
  @IsNotEmpty()
  transaction_id: string

  @ApiProperty({
    type: [GeneralItemDetailDTO],
    description: 'Item to transfer',
  })
  @IsNotEmpty()
  @IsArray()
  @Type(() => GeneralItemDetailDTO)
  @ValidateNested()
  item: GeneralItemDetailDTO[]
}

export class StockInitImportDTO {}
