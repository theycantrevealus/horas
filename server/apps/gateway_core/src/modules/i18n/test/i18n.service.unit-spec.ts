import {
  accountDocArray,
  mockAccount,
} from '@gateway_core/account/mock/account.mock'
import { mockAuthorityModel } from '@gateway_core/account/mock/authority.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Authority } from '@schemas/account/authority.model'
import { i18n, i18nDocument } from '@schemas/i18n/i18n'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

import { I18nService } from '../i18n.service'
import { i18nDocArray, mocki18n, mocki18nModel } from '../mock/i18n.mock'

describe('i18n Service', () => {
  let i18nService: I18nService
  let i18nModel: Model<i18n>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        I18nService,
        JwtService,
        AuthService,
        ConfigService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => 'any value',
            set: () => jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            verbose: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: getModelToken(i18n.name, 'primary'),
          useValue: mocki18nModel,
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthorityModel,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    i18nService = module.get<I18nService>(I18nService)
    i18nModel = module.get<Model<i18nDocument>>(
      getModelToken(i18n.name, 'primary')
    )
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(i18nService).toBeDefined()
    }
  )

  describe(testCaption('GET DATA', 'data', 'i18n - Fetch list'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(i18nModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(i18nDocArray),
        } as any)
        await i18nService
          .all(
            `{
              "first": 0,
              "rows": 10,
              "sortField": "created_at",
              "sortOrder": 1,
              "filters": {}
            }`
          )
          .then((result) => {
            // Should be an array of data
            expect(result.data).toBeInstanceOf(Array)

            // Data should be defined
            expect(result.data).toEqual(i18nDocArray)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on fetch data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

        jest.spyOn(i18nModel, 'aggregate').mockImplementation({
          exec: jest.fn().mockRejectedValue(new Error()),
        } as any)

        await expect(i18nService.all('')).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('GET DETAIL', 'data', 'i18n - Fetch detail'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        const findMock = i18nDocArray[0]
        i18nModel.findOne = jest.fn().mockImplementationOnce(() => {
          return Promise.resolve(findMock)
        })

        await i18nService.detail(findMock.id).then((result) => {
          // Deep equality check
          expect(result).toEqual(findMock)
        })
      }
    )

    it(
      testCaption(
        'HANDLING',
        'data',
        'Response error if detail data is not found',
        {
          tab: 1,
        }
      ),
      async () => {
        jest.spyOn(i18nModel, 'findOne').mockResolvedValue(null)
        await expect(async () => {
          await i18nService.detail(mocki18n().id)
        }).rejects.toThrow(NotFoundException)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on get detail data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(i18nModel, 'findOne').mockRejectedValue(new Error())
        await expect(async () => {
          await i18nService.detail(mocki18n().id)
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('ADD DATA', 'data', 'i18n - Add new data'), () => {
    it(testCaption('DATA', 'data', 'Should add new data'), async () => {
      jest.spyOn(i18nModel, 'create')

      await i18nService
        .add(
          {
            language_code: mocki18n().language_code,
            iso_2_digits: mocki18n().iso_2_digits,
            iso_3_digits: mocki18n().iso_3_digits,
            name: mocki18n().name,
            datetime: {
              short: {
                weekday: 'long' as const,
                era: 'short' as const,
                year: 'numeric' as const,
                month: 'short' as const,
                day: 'numeric' as const,
                hour: 'numeric' as const,
                minute: 'numeric' as const,
                second: 'numeric' as const,
                timezone_name: 'long' as const,
              },
              long: {
                weekday: 'short' as const,
                era: 'short' as const,
                year: 'numeric' as const,
                month: 'short' as const,
                day: 'numeric' as const,
                hour: 'numeric' as const,
                minute: 'numeric' as const,
                second: 'numeric' as const,
                timezone_name: 'long' as const,
              },
            },
            number: mocki18n().number,
            components: mocki18n().components,
            remark: mocki18n().remark,
          },
          mockAccount()
        )
        .then((result) => {
          // Should create id
          expect(result).toHaveProperty('id')
        })
    })

    it(
      testCaption('HANDLING', 'data', 'Response error on add data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(i18nModel, 'create').mockRejectedValue(new Error())
        await expect(async () => {
          await i18nService.add(
            {
              language_code: mocki18n().language_code,
              iso_2_digits: mocki18n().iso_2_digits,
              iso_3_digits: mocki18n().iso_3_digits,
              name: mocki18n().name,
              datetime: {
                short: {
                  weekday: 'long' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
                long: {
                  weekday: 'short' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
              },
              number: mocki18n().number,
              components: mocki18n().components,
              remark: mocki18n().remark,
            },
            mockAccount()
          )
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('EDIT DATA', 'data', 'i18n - Edit data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should edit data', { tab: 1 }),
      async () => {
        jest.spyOn(i18nModel, 'findOneAndUpdate')

        await i18nService
          .edit(
            {
              language_code: mocki18n().language_code,
              iso_2_digits: mocki18n().iso_2_digits,
              iso_3_digits: mocki18n().iso_3_digits,
              name: mocki18n().name,
              datetime: {
                short: {
                  weekday: 'long' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
                long: {
                  weekday: 'short' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
              },
              number: mocki18n().number,
              components: mocki18n().components,
              remark: mocki18n().remark,
              __v: 0,
            },
            accountDocArray[0].id
          )
          .then((result) => {
            // Should create id
            expect(result).toHaveProperty('id')
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error if data is not found', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(i18nModel, 'findOneAndUpdate').mockResolvedValue(null)

        await expect(async () => {
          await i18nService.edit(
            {
              language_code: mocki18n().language_code,
              iso_2_digits: mocki18n().iso_2_digits,
              iso_3_digits: mocki18n().iso_3_digits,
              name: mocki18n().name,
              datetime: {
                short: {
                  weekday: 'long' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
                long: {
                  weekday: 'short' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
              },
              number: mocki18n().number,
              components: mocki18n().components,
              remark: mocki18n().remark,
              __v: 0,
            },
            mocki18n().id
          )
        }).rejects.toThrow(NotFoundException)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on edit data', {
        tab: 1,
      }),
      async () => {
        const targetID = mocki18n().id

        jest.spyOn(i18nModel, 'findOneAndUpdate').mockImplementationOnce(() => {
          throw new Error()
        })

        await expect(async () => {
          await i18nService.edit(
            {
              language_code: mocki18n().language_code,
              iso_2_digits: mocki18n().iso_2_digits,
              iso_3_digits: mocki18n().iso_3_digits,
              name: mocki18n().name,
              datetime: {
                short: {
                  weekday: 'long' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
                long: {
                  weekday: 'short' as const,
                  era: 'short' as const,
                  year: 'numeric' as const,
                  month: 'short' as const,
                  day: 'numeric' as const,
                  hour: 'numeric' as const,
                  minute: 'numeric' as const,
                  second: 'numeric' as const,
                  timezone_name: 'long' as const,
                },
              },
              number: mocki18n().number,
              components: mocki18n().components,
              remark: mocki18n().remark,
              __v: 0,
            },
            targetID
          )
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('DELETE DATA', 'data', 'i18n - Delete data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response error if data is not found', {
        tab: 1,
      }),
      async () => {
        const targetID = mocki18n().id
        jest.spyOn(i18nModel, 'findOneAndUpdate').mockResolvedValue(null)

        await expect(async () => {
          await i18nService.delete(targetID)
        }).rejects.toThrow(NotFoundException)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on delete data', {
        tab: 1,
      }),
      async () => {
        const targetID = mocki18n().id
        jest.spyOn(i18nModel, 'findOneAndUpdate').mockRejectedValue(new Error())

        await expect(async () => {
          await i18nService.delete(targetID)
        }).rejects.toThrow(Error)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should success delete data', {
        tab: 1,
      }),
      async () => {
        jest
          .spyOn(i18nModel, 'findOneAndUpdate')
          .mockResolvedValue(i18nDocArray[0])

        await i18nService.delete(i18nDocArray[0].id).then((result) => {
          // Should return code if document found
          expect(result).toHaveProperty('language_code')
        })
      }
    )
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
