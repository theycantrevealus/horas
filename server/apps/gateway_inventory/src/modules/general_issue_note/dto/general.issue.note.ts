import { CMasterStockPoint } from '@gateway_core/master/dto/master.stock.point'
import { ApiProperty } from '@nestjs/swagger'
import { IGeneralIssueNoteDetail } from '@schemas/inventory/general.issue.note.detail.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { CGeneralIssueNoteDetail } from './general.issue.note.detail'

export class GeneralIssueNoteAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code. Left it blank so it will generate auto code',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
    description: 'Material requisition date',
  })
  @IsNotEmpty()
  transaction_date: Date

  @ApiProperty({
    example: 'material_requisition-xxxxx',
    description: 'Material requisition target',
  })
  @IsNotEmpty()
  material_requisition: string

  @ApiProperty({
    type: CMasterStockPoint,
    description: 'Stock point source',
  })
  @Type(() => CMasterStockPoint)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  stock_point: IMasterStockPoint

  @ApiProperty({
    type: CGeneralIssueNoteDetail,
    description: 'Locale',
    isArray: true,
  })
  @IsNotEmpty()
  @IsArray()
  @Type(() => CGeneralIssueNoteDetail)
  @ValidateNested({ each: true })
  detail: IGeneralIssueNoteDetail[]

  @ApiProperty({
    example: '',
    description: 'Any extra object',
    required: false,
  })
  @IsOptional()
  extras: any

  @ApiProperty({
    example: 'Extra description',
    description: '',
    required: false,
  })
  remark: string
}
