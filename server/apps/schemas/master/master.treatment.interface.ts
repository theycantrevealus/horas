import { ILOV } from '@schemas/lov/lov.interface'
import { IMasterInsurance } from '@schemas/master/master.insurance'

export interface IMasterTreatment {
  id: string
  code: string
  name: string
}

export interface IMasterTreatmentPriceRate {
  insurance: IMasterInsurance
  rate: ILOV
  price: number
}

export interface IMasterTreatmentPriceRate {
  insurance: IMasterInsurance
  rate: ILOV
  price: number
}
