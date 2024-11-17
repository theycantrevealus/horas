import { faker } from '@faker-js/faker'
import {
  MasterReceptionistCounterAddDTO,
  MasterReceptionistCounterEditDTO,
} from '@gateway_core/master/dto/master.receptionist.counter'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterReceptionistCounterAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        type: [],
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterReceptionistCounterAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        type: [],
      },
    },
    {
      expectedToContain: 'type must be an array',
      targetClass: MasterReceptionistCounterAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        type: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterReceptionistCounterAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        type: [],
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterReceptionistCounterEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        type: [],
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterReceptionistCounterEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        type: [],
        __v: 0,
      },
    },
    {
      expectedToContain: 'type must be an array',
      targetClass: MasterReceptionistCounterAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        type: 'testing',
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MasterReceptionistCounterEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        type: [],
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterReceptionistCounterEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        type: [],
        __v: 0,
      },
    },
  ],
}
describe('Master Receptionist Counter DTO Test', () => {
  describe(
    testCaption('ADD', 'data', 'Master receptionist counter add'),
    () => {
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
    }
  )

  describe(
    testCaption('EDIT', 'data', 'Master receptionist counter edit'),
    () => {
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
    }
  )
})
