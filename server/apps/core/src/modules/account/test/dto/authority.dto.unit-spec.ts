import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@core/account/dto/authority.dto'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

describe('Authority DTO', () => {
  const falseCasePayload = {
    add: [
      {
        expectedToContain: 'code should not be empty',
        targetClass: AuthorityAddDTO,
        testType: -1,
        data: {},
      },
      {
        expectedToContain: 'code must be a string',
        targetClass: AuthorityAddDTO,
        testType: -1,
        data: {
          code: 1,
        },
      },
      {
        expectedToContain: 'name should not be empty',
        targetClass: AuthorityAddDTO,
        testType: -1,
        data: {},
      },
      {
        expectedToContain: 'name must be a string',
        targetClass: AuthorityAddDTO,
        testType: -1,
        data: {
          name: 1,
        },
      },
      {
        expectedToContain: 'Correct data',
        targetClass: AuthorityAddDTO,
        testType: 1,
        data: {
          code: 'AUTH-203',
          name: 'Sample Authority',
        },
      },
    ],
    edit: [
      {
        expectedToContain: 'code should not be empty',
        targetClass: AuthorityEditDTO,
        testType: -1,
        data: {},
      },
      {
        expectedToContain: 'code must be a string',
        targetClass: AuthorityEditDTO,
        testType: -1,
        data: {
          code: 1,
        },
      },
      {
        expectedToContain: 'name should not be empty',
        targetClass: AuthorityEditDTO,
        testType: -1,
        data: {},
      },
      {
        expectedToContain: 'name must be a string',
        targetClass: AuthorityEditDTO,
        testType: -1,
        data: {
          name: 1,
        },
      },
      {
        expectedToContain: '__v must be a number',
        targetClass: AuthorityEditDTO,
        testType: -1,
        data: {
          __v: 'testing',
        },
      },
      {
        expectedToContain: 'Correct data',
        targetClass: AuthorityEditDTO,
        testType: 1,
        data: {
          code: 'AUTH-203',
          name: 'Sample Authority',
          __v: 0,
        },
      },
    ],
  }

  beforeEach(async () => {})

  describe(testCaption('ADD', 'data', 'Authority add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Authority edit'), () => {
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
