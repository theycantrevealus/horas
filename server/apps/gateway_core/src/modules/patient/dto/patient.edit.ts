import { ApiProperty } from '@nestjs/swagger'
import {
  IPatientBasicInfo,
  PatientBasicInfo,
} from '@schemas/patient/patient.basic'
import {
  IPatientMedicalInfo,
  PatientMedicalInfo,
} from '@schemas/patient/patient.medical'

export class PatientEditDTO {
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
}
