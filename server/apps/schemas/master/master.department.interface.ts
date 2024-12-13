import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { IMasterTreatment } from '@schemas/master/master.treatment.interface'

export interface IMasterDepartment {
  id: string
  code: string
  name: string
}

export interface IDepartmentConfiguration {
  default_consultation_treatment: IMasterTreatment
  treatment: IMasterDepartment[]
  doctor: IAccount[]
}
