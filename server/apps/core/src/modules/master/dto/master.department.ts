import { CAccount } from '@core/account/dto/account.dto'
import { IDoctor } from '@core/account/interface/account'
import { ApiProperty } from '@nestjs/swagger'
import { IDepartmentConfiguration } from '@schemas/master/master.department'
import { IMasterTreatment } from '@schemas/master/master.treatment'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Types } from 'mongoose'

import { CMasterTreatment } from '../../../../../dto/master/master.treatment.dto'

export class CMasterDepartment {
  @ApiProperty({
    type: String,
    example: `brand-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Dumin Rectal',
  })
  name: string
}

export class CDepartmentConfiguration {
  @ApiProperty({
    type: CMasterTreatment,
    required: false,
    description: 'Default consultation treatment. For charged',
  })
  @Type(() => CMasterTreatment)
  default_consultation_treatment: IMasterTreatment

  @ApiProperty({
    type: CMasterTreatment,
    isArray: true,
    required: false,
    default: [],
    description: 'Registered treatment for polyclinic',
  })
  @Type(() => CMasterTreatment)
  @ValidateNested({ each: true })
  @IsArray()
  treatment: IMasterTreatment[]

  @ApiProperty({
    type: CAccount,
    isArray: true,
    required: false,
    default: [],
    description: 'Registered doctor for polyclinic',
  })
  @Type(() => CAccount)
  @ValidateNested({ each: true })
  @IsArray()
  doctor: IDoctor[]
}

export class MasterDepartmentAddDTO {
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
    example: 'Polyclinic Name',
    description: 'Department name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Department extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    type: CDepartmentConfiguration,
    description: 'Target stock point',
  })
  @Type(() => CDepartmentConfiguration)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  configuration: IDepartmentConfiguration
}

export class MasterDepartmentEditDTO {
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
    example: 'Polyclinic Name',
    description: 'Department name',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Extra remark',
    description: 'Department extra remark',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  remark?: string

  @ApiProperty({
    example: 0,
    description: 'Department document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
