import { faker } from '@faker-js/faker'
import {
  AccountAddDTO,
  AccountEditDTO,
} from '@gateway_core/account/dto/account.dto'
import { AccountSignInDTO } from '@gateway_core/account/dto/account.signin.dto'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'email should not be empty',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'email must be an email',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {
        email: 'Hello there',
      },
    },
    {
      expectedToContain: 'password should not be empty',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'password must be longer than or equal',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {
        password: '1234567',
      },
    },
    {
      expectedToContain: 'first_name should not be empty',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'first_name must be a string',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {
        first_name: 123,
      },
    },
    {
      expectedToContain: 'first_name must be longer than or equal to',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {
        first_name: 'ab',
      },
    },
    {
      expectedToContain: 'last_name must be a string',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {
        last_name: 123,
      },
    },
    {
      expectedToContain: 'phone should not be empty',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'phone must be a valid phone number',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {
        phone: 'abc',
      },
    },
    {
      expectedToContain: 'stock_point should not be empty',
      targetClass: AccountAddDTO,
      testType: -1,
      data: {
        email: faker.internet.email(),
        password: faker.internet.password({ length: 24 }),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone: `+62${'0###########'.replace(/#+/g, (m) =>
          faker.string.numeric(m.length)
        )}`,
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: AccountAddDTO,
      testType: 1,
      data: {
        email: faker.internet.email(),
        password: faker.internet.password({ length: 24 }),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone: `+62${'0###########'.replace(/#+/g, (m) =>
          faker.string.numeric(m.length)
        )}`,
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'email should not be empty',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'email must be an email',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {
        email: 'Hello there',
      },
    },
    {
      expectedToContain: 'first_name should not be empty',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'first_name must be a string',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {
        first_name: 123,
      },
    },
    {
      expectedToContain: 'first_name must be longer than or equal to',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {
        first_name: 'ab',
      },
    },
    {
      expectedToContain: 'last_name must be a string',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {
        last_name: 123,
      },
    },
    {
      expectedToContain: 'phone should not be empty',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'phone must be a valid phone number',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {
        phone: 'abc',
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: AccountEditDTO,
      testType: -1,
      data: {
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: AccountEditDTO,
      testType: 1,
      data: {
        email: faker.internet.email(),
        password: faker.internet.password({ length: 24 }),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone: `+62${'0###########'.replace(/#+/g, (m) =>
          faker.string.numeric(m.length)
        )}`,
        __v: 0,
      },
    },
  ],
  signIn: [
    {
      expectedToContain: 'email should not be empty',
      targetClass: AccountSignInDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'email must be an email',
      targetClass: AccountSignInDTO,
      testType: -1,
      data: {
        email: 'Hello there',
      },
    },
    {
      expectedToContain: 'password should not be empty',
      targetClass: AccountSignInDTO,
      testType: -1,
      data: {},
    },
    {
      expectedToContain: 'Correct data',
      targetClass: AccountSignInDTO,
      testType: 1,
      data: {
        email: faker.internet.email(),
        password: faker.internet.password({ length: 24 }),
      },
    },
  ],
}
describe('Account DTO Test', () => {
  describe(testCaption('AUTH', 'data', 'Account Sign In'), () => {
    for (const tKey of falseCasePayload.signIn) {
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

  describe(testCaption('ADD', 'data', 'Account add'), () => {
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
            expect(errors.length).toBeGreaterThan(0)
          }
        }
      )
    }
  })

  describe(testCaption('EDIT', 'data', 'Account edit'), () => {
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
            expect(errors.length).toBeGreaterThan(0)
          }
        }
      )
    }
  })
})

// describe('Account DTO', () => {

//
//   // beforeEach(async () => {})
//

//

// })
