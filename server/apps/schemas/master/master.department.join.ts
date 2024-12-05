import { raw } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterTreatmentJoin } from '@schemas/master/master.treatment.join'

export const MasterDepartmentJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export const DepartmentConfigurationJoin = raw({
  default_consultation_treatment: { type: MasterTreatmentJoin, _id: false },
  treatment: { type: [MasterTreatmentJoin], _id: false },
  doctor: { type: [AccountJoin], _id: false },
})
