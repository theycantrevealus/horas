import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber } from 'class-validator'

export class MaterialRequisitionApproval {
  @ApiProperty({
    example: 'approved',
    enum: [
      'need_approval',
      'approved',
      'declined',
      'processed',
      'completed',
      'purchase_requisition',
      'cancelled',
    ],
    description: 'Approval status',
  })
  @IsNotEmpty()
  status: string

  @ApiProperty({
    example: 'Extra description',
    description: '',
  })
  @IsNotEmpty()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
