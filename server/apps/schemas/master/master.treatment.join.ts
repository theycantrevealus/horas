import { raw } from '@nestjs/mongoose'
import { LOVJoin } from '@schemas/lov/lov.join'
import { MasterInsuranceJoin } from '@schemas/master/master.insurance'

export const MasterTreatmentPriceRateJoin = raw({
  insurance: { type: MasterInsuranceJoin },
  rate: { type: LOVJoin },
  price: { type: Number },
})

export const MasterTreatmentJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})
