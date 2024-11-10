import { faker } from '@faker-js/faker'
import {
  MasterQueueAddDTO,
  MasterQueueEditDTO,
} from '@gateway_core/master/dto/master.queue'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code should not be empty',
      targetClass: MasterQueueAddDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'code must be longer than or equal to 3 characters',
      targetClass: MasterQueueAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 2, casing: 'upper' }),
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 3 characters',
      targetClass: MasterQueueAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 4, casing: 'upper' }),
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterQueueAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 3, casing: 'upper' }),
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'code should not be empty',
      targetClass: MasterQueueEditDTO,
      testType: -1,
      data: {
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be longer than or equal to 3 characters',
      targetClass: MasterQueueEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 2, casing: 'upper' }),
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 3 characters',
      targetClass: MasterQueueEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 4, casing: 'upper' }),
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MasterQueueEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 3, casing: 'upper' }),
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterQueueEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 3, casing: 'upper' }),
        __v: 0,
      },
    },
  ],
}
describe('Master Queue DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Master queu add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Master queue edit'), () => {
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
