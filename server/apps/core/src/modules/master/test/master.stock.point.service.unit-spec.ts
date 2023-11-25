import { AccountService } from '@core/account/account.service'
import { mockAccount, mockAccountModel } from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority,mock'
import { Account } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority.model'
import {
  masterStockPointDocArray,
  mockMasterStockPoint,
  mockMasterStockPointModel,
} from '@core/master/mock/master.stock.point.mock'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@core/master/schemas/master.stock.point'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
import { createMock } from '@golevelup/ts-jest'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model, Query, Types } from 'mongoose'

describe('Master Stock Point Service', () => {
  let masterStockPointService: MasterStockPointService
  let masterStockPointModel: Model<MasterStockPoint>
  const dataSet = mockMasterStockPoint()

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterStockPointService,
        AccountService,
        AuthService,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return null
            }),
          },
        },
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
          provide: getModelToken(MasterStockPoint.name),
          useValue: mockMasterStockPointModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthority,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    masterStockPointService = module.get<MasterStockPointService>(
      MasterStockPointService
    )
    masterStockPointModel = module.get<Model<MasterStockPointDocument>>(
      getModelToken(MasterStockPoint.name)
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterStockPointService).toBeDefined()
    }
  )

  it(testCaption('DATA', 'data', 'Should list all data'), async () => {
    jest.spyOn(masterStockPointModel, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(masterStockPointDocArray),
    } as any)
    await masterStockPointService
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
        expect(result.transaction_classify).toEqual(
          'MASTER_ITEM_STOCK_POINT_LIST'
        )
        expect(result.message).not.toBe('')
        expect(result.statusCode.customCode).toEqual(modCodes.Global.success)
        expect(result.payload).toBeInstanceOf(Array)
        expect(result.payload).toEqual(masterStockPointDocArray)
      })
  })

  it(
    testCaption('DATA', 'data', 'Should show master stock point detail'),
    async () => {
      jest.spyOn(masterStockPointModel, 'findOne').mockReturnValueOnce(
        createMock<Query<MasterStockPointDocument, MasterStockPointDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterStockPointDocArray[0]),
        }) as any
      )

      const findMock = masterStockPointDocArray[0]
      const foundData = await masterStockPointService.detail(
        masterStockPointDocArray[0].id
      )
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master stock point'),
    async () => {
      masterStockPointModel.create = jest.fn().mockImplementationOnce(() => {
        return Promise.resolve(dataSet)
      })

      jest.spyOn(masterStockPointModel, 'create')

      const newEntry = (await masterStockPointService.add(
        mockMasterStockPoint(),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(
    testCaption('DATA', 'data', 'Should edit master stock point data'),
    async () => {
      jest.spyOn(masterStockPointModel, 'findOneAndUpdate').mockReturnValueOnce(
        createMock<Query<MasterStockPointDocument, MasterStockPointDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterStockPointDocArray[0]),
        }) as any
      )

      const data = (await masterStockPointService.edit(
        {
          ...mockMasterStockPoint(),
          __v: 0,
        },
        `stock_point-${new Types.ObjectId().toString()}`
      )) satisfies GlobalResponse
      expect(data.payload).toHaveProperty('code')
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
