import { faker } from '@faker-js/faker'
import { raw } from '@nestjs/mongoose'
import { Types } from 'mongoose'

export const MasterItemSupplierJoin = raw({
  id: { type: String, example: `supplier-${new Types.ObjectId().toString()}` },
  code: { type: String, example: 'SUP00001' },
  name: { type: String, example: faker.company.name() },
})

export interface IMasterItemSupplier {
  id: string
  code: string
  name: string
}
