import { CLOV } from '@gateway_core/lov/dto/lov'
import { ApiProperty } from '@nestjs/swagger'
import { ILOV } from '@schemas/lov/lov.interface'
import {
  CMasterInsurance,
  IMasterInsurance,
} from '@schemas/master/master.insurance'
import { CMasterPartner, IMasterPartner } from '@schemas/master/master.partner'
import { IMasterTreatmentPriceRate } from '@schemas/master/master.treatment.interface'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator'

export class CMasterTreatment {
  @ApiProperty({
    type: String,
    required: true,
    example: '',
  })
  @IsNotEmpty()
  id: string

  @ApiProperty({
    type: String,
    example: '',
  })
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    example: '',
  })
  @IsNotEmpty()
  name: string
}

export class CMasterTreatmentPriceRate {
  @ApiProperty({
    type: CMasterInsurance,
    description: 'Insurance configuration',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  insurance: IMasterInsurance

  @ApiProperty({
    type: CLOV,
    description: 'Rate',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  rate: ILOV

  @ApiProperty({
    example: 'Treatment Name',
    description: 'Treatment name',
  })
  @IsNotEmpty()
  name: string
}

export class MasterTreatmentAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of department',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Treatment Name',
    description: 'Treatment name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Treatment extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Treatment configuration',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  group: ILOV[]

  @ApiProperty({
    type: CMasterTreatmentPriceRate,
    isArray: true,
    description: 'Treatment rate',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  rate: IMasterTreatmentPriceRate[]

  @ApiProperty({
    type: CMasterPartner,
    isArray: true,
    description: 'Treatment configuration',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  partner: IMasterPartner[]
}

export class MasterTreatmentEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    minLength: 8,
    maxLength: 24,
    description: 'Unique code of department',
  })
  @MinLength(8)
  @MaxLength(24)
  @IsNotEmpty()
  code: string

  @ApiProperty({
    example: 'Treatment Name',
    description: 'Treatment name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Treatment extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    type: CLOV,
    isArray: true,
    description: 'Treatment configuration',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  group: ILOV[]

  @ApiProperty({
    type: CMasterTreatmentPriceRate,
    isArray: true,
    description: 'Treatment rate',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  rate: IMasterTreatmentPriceRate[]

  @ApiProperty({
    type: CMasterPartner,
    isArray: true,
    description: 'Treatment configuration',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  partner: IMasterPartner[]

  @ApiProperty({
    example: 0,
    description: 'Department document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
