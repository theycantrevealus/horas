import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import { faker } from '@faker-js/faker'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
      },
    },
    {
      expectedToContain: 'phone should not be empty',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
      },
    },
    {
      expectedToContain: 'email should not be empty',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
      },
    },
    {
      expectedToContain: 'sales_name should not be empty',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
      },
    },
    {
      expectedToContain: 'address should not be empty',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterItemSupplierAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterItemSupplierEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterItemSupplierEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
        __v: 0,
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterItemSupplierEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
        __v: 0,
      },
    },
    {
      expectedToContain: 'phone should not be empty',
      targetClass: MasterItemSupplierEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
        __v: 0,
      },
    },
    {
      expectedToContain: 'email should not be empty',
      targetClass: MasterItemSupplierEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
        __v: 0,
      },
    },
    {
      expectedToContain: 'sales_name should not be empty',
      targetClass: MasterItemSupplierAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        __v: 0,
      },
    },
    {
      expectedToContain: 'address should not be empty',
      targetClass: MasterItemSupplierEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        __v: 0,
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterItemSupplierEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        phone: faker.helpers.replaceSymbolWithNumber('xxxxxxxxxx'),
        email: faker.internet.email(),
        sales_name: faker.person.firstName(),
        address: faker.location.streetAddress(),
        __v: 0,
      },
    },
  ],
}
describe('Master Item Category DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Master item category add'), () => {
    for (const tKey of falseCasePayload.add) {
      it(
        testCaption(
          tKey.testType < 0 ? 'NEGATIVE' : 'POSITIVE',
          'data',
          `${tKey.expectedToContain}`,
          {
            tab: 1,
          }
        ),
        async () => {
          const ofImportDto = plainToInstance(tKey.targetClass, tKey.data)
          const errors = await validate(ofImportDto)
          if (tKey.testType < 0) {
            expect(errors.length).not.toBe(0)
            expect(JSON.stringify(errors)).toContain(tKey.expectedToContain)
          } else {
            expect(errors.length).toBe(0)
          }
        }
      )
    }
  })

  describe(testCaption('EDIT', 'data', 'Master item category edit'), () => {
    for (const tKey of falseCasePayload.edit) {
      it(
        testCaption(
          tKey.testType < 0 ? 'NEGATIVE' : 'POSITIVE',
          'data',
          `${tKey.expectedToContain}`,
          {
            tab: 1,
          }
        ),
        async () => {
          const ofImportDto = plainToInstance(tKey.targetClass, tKey.data)
          const errors = await validate(ofImportDto)
          if (tKey.testType < 0) {
            expect(errors.length).not.toBe(0)
            expect(JSON.stringify(errors)).toContain(tKey.expectedToContain)
          } else {
            expect(errors.length).toBe(0)
          }
        }
      )
    }
  })
})
