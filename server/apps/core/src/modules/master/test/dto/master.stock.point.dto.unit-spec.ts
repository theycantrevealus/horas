import {
  MasterStockPointAddDTO,
  MasterStockPointEditDTO,
} from '@core/master/dto/master.stock.point'
import { faker } from '@faker-js/faker'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterStockPointAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterStockPointAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterStockPointAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterStockPointAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterStockPointEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterStockPointEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterStockPointEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'configuration should not be empty',
      targetClass: MasterStockPointEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MasterStockPointEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterStockPointEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          allow_grn: true,
          allow_incoming: true,
          allow_outgoing: true,
          allow_destruction: true,
        },
        __v: 0,
      },
    },
  ],
}
describe('Master Stock Point DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Master stock point add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Master stock point edit'), () => {
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
