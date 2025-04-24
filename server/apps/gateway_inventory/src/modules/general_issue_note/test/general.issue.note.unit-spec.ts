import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { Authority } from '@schemas/account/authority.model'
import {
  GeneralIssueNote,
  GeneralIssueNoteDocument,
} from '@schemas/inventory/general.issue.note'
import {
  MaterialRequisition,
  MaterialRequisitionDocument,
} from '@schemas/inventory/material.requisition'
import { AuthService } from '@security/auth.service'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { GeneralIssueNoteAddDTO } from '../dto/general.issue.note'
import { GatewayInventoryGeneralIssueNoteService } from '../general.issue.note.service'
import {
  generalIssueNoteDocArray,
  mockGeneralIssueNote,
  mockGeneralIssueNoteModel,
} from '../mock/general.issue.note.mock'
import {
  mockMaterialRequisition,
  mockMaterialRequisitionModel,
} from '../mock/material.requisition.mock'

describe('General Issue Note Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let generalIssueNoteService: GatewayInventoryGeneralIssueNoteService
  let generalIssueNoteModel: Model<GeneralIssueNote>
  let materialRequisitionModel: Model<MaterialRequisition>
  let stockClient: KafkaService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        GatewayInventoryGeneralIssueNoteService,
        AuthService,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Test'),
            set: () => jest.fn().mockResolvedValue('Test'),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => '',
            set: () => jest.fn(),
          },
        },
        {
          provide: 'STOCK_SERVICE',
          useValue: {
            send: () => jest.fn(),
            transaction: jest.fn().mockImplementation(() => ({
              send: () => jest.fn(),
              abort: () => jest.fn(),
              commit: () =>
                jest.fn().mockResolvedValue({
                  message: '',
                  transaction_id: '',
                  payload: {},
                }),
            })),
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
          provide: getModelToken(GeneralIssueNote.name, 'primary'),
          useValue: mockGeneralIssueNoteModel,
        },
        {
          provide: getModelToken(MaterialRequisition.name, 'primary'),
          useValue: mockMaterialRequisitionModel,
        },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: {},
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    configService = module.get<ConfigService>(ConfigService)

    generalIssueNoteService =
      module.get<GatewayInventoryGeneralIssueNoteService>(
        GatewayInventoryGeneralIssueNoteService
      )
    generalIssueNoteModel = module.get<Model<GeneralIssueNoteDocument>>(
      getModelToken(GeneralIssueNote.name, 'primary')
    )

    materialRequisitionModel = module.get<Model<MaterialRequisitionDocument>>(
      getModelToken(MaterialRequisition.name, 'primary')
    )

    cacheManager = module.get(CACHE_MANAGER)

    stockClient = module.get('STOCK_SERVICE')

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(generalIssueNoteService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'General Issue Note - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(generalIssueNoteModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(generalIssueNoteDocArray),
          } as any)
          await generalIssueNoteService
            .list(
              `{
                "first": 0,
                "rows": 10,
                "sortField": "created_at",
                "sortOrder": 1,
                "filters": {}
              }`,
              mockAccount()
            )
            .then((result) => {
              // Should be an array of data
              expect(result.data).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.data).toEqual(generalIssueNoteDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(generalIssueNoteModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            generalIssueNoteService.list('', mockAccount())
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'General Issue Note - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new general issue note'),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest.spyOn(generalIssueNoteModel, 'create')

          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

          jest
            .spyOn(materialRequisitionModel, 'findOne')
            .mockResolvedValue(mockMaterialRequisition())

          const dataParam: GeneralIssueNoteAddDTO = {
            code: mockGeneralIssueNote().code,
            transaction_date: new Date(),
            material_requisition: '',
            stock_point: mockGeneralIssueNote().stock_point_from,
            detail: mockGeneralIssueNote().detail,
            extras: mockGeneralIssueNote().extras,
            remark: mockGeneralIssueNote().remark,
          }

          await generalIssueNoteService
            .add(dataParam, mockAccount(), '')
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')
            })
        }
      )

      // it(
      //   testCaption('DATA', 'data', 'Should replace code if not defined'),
      //   async () => {
      //     jest.spyOn(generalIssueNoteService, 'add')

      //     jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

      //     const dataParam: GeneralIssueNoteAddDTO = {
      //       code: mockGeneralIssueNote().code,
      //       transaction_date: new Date(),
      //       material_requisition: '',
      //       stock_point: mockGeneralIssueNote().stock_point_from,
      //       detail: mockGeneralIssueNote().detail,
      //       extras: mockGeneralIssueNote().extras,
      //       remark: mockGeneralIssueNote().remark,
      //     }

      //     delete dataParam.code

      //     await generalIssueNoteService
      //       .add(dataParam, mockAccount(), '')
      //       .then((result) => {
      //         // Should create id
      //         expect(result).toHaveProperty('id')

      //         expect(result).toHaveProperty('code')

      //         expect(result['code']).not.toBe('')
      //       })
      //   }
      // )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Should abort transaction if material requisition is not found',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

          jest
            .spyOn(materialRequisitionModel, 'findOne')
            .mockResolvedValue(null)

          jest.spyOn(generalIssueNoteModel, 'create')

          const dataParam: GeneralIssueNoteAddDTO = {
            code: mockGeneralIssueNote().code,
            transaction_date: new Date(),
            material_requisition: '',
            stock_point: mockGeneralIssueNote().stock_point_from,
            detail: mockGeneralIssueNote().detail,
            extras: mockGeneralIssueNote().extras,
            remark: mockGeneralIssueNote().remark,
          }

          await expect(async () => {
            await generalIssueNoteService.add(dataParam, mockAccount(), '')
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Should abort transaction if any error occur on commit',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

          jest.spyOn(generalIssueNoteModel, 'create')

          jest.spyOn(stockClient, 'send').mockRejectedValue(new Error())

          const dataParam: GeneralIssueNoteAddDTO = {
            code: mockGeneralIssueNote().code,
            transaction_date: new Date(),
            material_requisition: '',
            stock_point: mockGeneralIssueNote().stock_point_from,
            detail: mockGeneralIssueNote().detail,
            extras: mockGeneralIssueNote().extras,
            remark: mockGeneralIssueNote().remark,
          }

          await expect(async () => {
            await generalIssueNoteService.add(dataParam, mockAccount(), '')
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Should abort transaction if any error occur on create general issue note',
          {
            tab: 1,
          }
        ),
        async () => {
          const transaction = await stockClient.transaction('sample')
          jest.spyOn(transaction, 'send').mockImplementationOnce(() => {
            throw new Error()
          })

          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

          jest
            .spyOn(generalIssueNoteModel, 'create')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          const dataParam: GeneralIssueNoteAddDTO = {
            code: mockGeneralIssueNote().code,
            transaction_date: new Date(),
            material_requisition: '',
            stock_point: mockGeneralIssueNote().stock_point_from,
            detail: mockGeneralIssueNote().detail,
            extras: mockGeneralIssueNote().extras,
            remark: mockGeneralIssueNote().remark,
          }

          await expect(async () => {
            await generalIssueNoteService.add(dataParam, mockAccount(), '')
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(generalIssueNoteService, 'add')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

          const dataParam: GeneralIssueNoteAddDTO = {
            code: mockGeneralIssueNote().code,
            transaction_date: new Date(),
            material_requisition: '',
            stock_point: mockGeneralIssueNote().stock_point_from,
            detail: mockGeneralIssueNote().detail,
            extras: mockGeneralIssueNote().extras,
            remark: mockGeneralIssueNote().remark,
          }

          await expect(async () => {
            await generalIssueNoteService.add(dataParam, mockAccount(), '')
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
