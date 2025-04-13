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
import { LOV, LOVDocument } from '@schemas/lov/lov'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

import { LOVService } from '../lov.service'
import { mockLOV, mockLOVDocArray, mockLOVModel } from '../mock/lov.mock'

describe('LOV Service', () => {
  let lovService: LOVService
  let lovModel: Model<LOV>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        LOVService,
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
          provide: getModelToken(LOV.name, 'primary'),
          useValue: mockLOVModel,
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthorityModel,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    lovService = module.get<LOVService>(LOVService)
    lovModel = module.get<Model<LOVDocument>>(
      getModelToken(LOV.name, 'primary')
    )
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(lovService).toBeDefined()
    }
  )

  describe(testCaption('GET DATA', 'data', 'LOV - Fetch list'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(lovModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(mockLOVDocArray),
        } as any)
        await lovService
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
            expect(result.data).toEqual(mockLOVDocArray)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on fetch data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

        jest.spyOn(lovModel, 'aggregate').mockImplementation({
          exec: jest.fn().mockRejectedValue(new Error()),
        } as any)

        await expect(lovService.all('')).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('GET DETAIL', 'data', 'LOV - Fetch detail'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        const findMock = mockLOVDocArray[0]
        lovModel.findOne = jest.fn().mockImplementationOnce(() => {
          return Promise.resolve(findMock)
        })

        await lovService.detail(findMock.id).then((result) => {
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
        jest.spyOn(lovModel, 'findOne').mockResolvedValue(null)
        await expect(async () => {
          await lovService.detail(mockLOV().id)
        }).rejects.toThrow(NotFoundException)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on get detail data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(lovModel, 'findOne').mockRejectedValue(new Error())
        await expect(async () => {
          await lovService.detail(mockLOV().id)
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('ADD DATA', 'data', 'LOV - Add new data'), () => {
    it(testCaption('DATA', 'data', 'Should add new data'), async () => {
      jest.spyOn(lovModel, 'create')

      await lovService
        .add(
          {
            group: mockLOV().group,
            name: mockLOV().name,
            parent: mockLOV().parent,
            remark: mockLOV().remark,
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
        jest.spyOn(lovModel, 'create').mockRejectedValue(new Error())
        await expect(async () => {
          await lovService.add(
            {
              group: mockLOV().group,
              name: mockLOV().name,
              parent: mockLOV().parent,
              remark: mockLOV().remark,
            },
            mockAccount()
          )
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('EDIT DATA', 'data', 'LOV - Edit data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should edit data', { tab: 1 }),
      async () => {
        jest.spyOn(lovModel, 'findOneAndUpdate')

        await lovService
          .edit(
            {
              group: mockLOV().group,
              name: mockLOV().name,
              parent: mockLOV().parent,
              remark: mockLOV().remark,
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
        const targetID = mockLOV().id
        jest.spyOn(lovModel, 'findOneAndUpdate').mockResolvedValue(null)

        await expect(async () => {
          await lovService.edit(
            {
              group: mockLOV().group,
              name: mockLOV().name,
              parent: mockLOV().parent,
              remark: mockLOV().remark,
              __v: 0,
            },
            targetID
          )
        }).rejects.toThrow(NotFoundException)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on edit data', {
        tab: 1,
      }),
      async () => {
        const targetID = mockLOV().id

        jest.spyOn(lovModel, 'findOneAndUpdate').mockImplementationOnce(() => {
          throw new Error()
        })

        await expect(async () => {
          await lovService.edit(
            {
              group: mockLOV().group,
              name: mockLOV().name,
              parent: mockLOV().parent,
              remark: mockLOV().remark,
              __v: 0,
            },
            targetID
          )
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(testCaption('DELETE DATA', 'data', 'LOV - Delete data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response error if data is not found', {
        tab: 1,
      }),
      async () => {
        const targetID = mockLOV().id
        jest.spyOn(lovModel, 'findOneAndUpdate').mockResolvedValue(null)

        await expect(async () => {
          await lovService.delete(targetID)
        }).rejects.toThrow(NotFoundException)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on delete data', {
        tab: 1,
      }),
      async () => {
        const targetID = mockLOV().id
        jest.spyOn(lovModel, 'findOneAndUpdate').mockRejectedValue(new Error())

        await expect(async () => {
          await lovService.delete(targetID)
        }).rejects.toThrow(Error)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should success delete data', {
        tab: 1,
      }),
      async () => {
        jest
          .spyOn(lovModel, 'findOneAndUpdate')
          .mockResolvedValue(mockLOVDocArray[0])

        await lovService.delete(mockLOVDocArray[0].id).then((result) => {
          // Should return code if document found
          expect(result).toHaveProperty('name')
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
