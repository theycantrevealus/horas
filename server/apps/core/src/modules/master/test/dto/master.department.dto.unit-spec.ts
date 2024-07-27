import {
  MasterDepartmentAddDTO,
  MasterDepartmentEditDTO,
} from '@core/master/dto/master.department'
import { faker } from '@faker-js/faker'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterDepartmentAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterDepartmentAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterDepartmentAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterDepartmentAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterDepartmentEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterDepartmentEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterDepartmentEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MasterDepartmentEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterDepartmentEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.company.name(),
        configuration: {
          default_consultation_treatment: {},
          treatment: [],
          doctor: [],
        },
        __v: 0,
      },
    },
  ],
}
describe('Master Department DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Master department add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Master department edit'), () => {
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
