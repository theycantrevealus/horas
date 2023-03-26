import {
  IPatientBasicInfo,
  PatientBasicInfo,
} from '@core/patient/schema/patient.basic'
import {
  IPatientMedicalInfo,
  PatientMedicalInfo,
} from '@core/patient/schema/patient.medical'
import { ApiProperty } from '@nestjs/swagger'

export class PatientAddDTO {
  @ApiProperty({
    type: PatientMedicalInfo,
  })
  medical_info: IPatientMedicalInfo

  @ApiProperty({
    type: PatientBasicInfo,
  })
  basic_info: IPatientBasicInfo

  @ApiProperty({
    type: Number,
    example: 0,
  })
  __v: number

  constructor(data: any) {
    this.medical_info = data.medical_info
    this.basic_info = data.basic_info
    this.__v = data.__v
  }
}
