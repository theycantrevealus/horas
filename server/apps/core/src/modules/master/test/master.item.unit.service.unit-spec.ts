import { AccountService } from '@core/account/account.service'
import { mockAccount, mockAccountModel } from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority,mock'
import { Account } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority.model'
import {
  masterItemUnitDocArray,
  mockMasterItemUnit,
  mockMasterItemUnitModel,
} from '@core/master/mock/master.item.unit.mock'
import {
  MasterItemUnit,
  MasterItemUnitDocument,
} from '@core/master/schemas/master.item.unit'
import { MasterItemUnitService } from '@core/master/services/master.item.unit.service'
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

describe('Master Item Unit Service', () => {
  let masterItemUnitService: MasterItemUnitService
  let masterItemUnitModel: Model<MasterItemUnit>
  const dataSet = mockMasterItemUnit()

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemUnitService,
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
          provide: getModelToken(MasterItemUnit.name),
          useValue: mockMasterItemUnitModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    masterItemUnitService = module.get<MasterItemUnitService>(
      MasterItemUnitService
    )
    masterItemUnitModel = module.get<Model<MasterItemUnitDocument>>(
      getModelToken(MasterItemUnit.name)
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterItemUnitService).toBeDefined()
    }
  )

  it(testCaption('DATA', 'data', 'Should list all data'), async () => {
    jest.spyOn(masterItemUnitModel, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(masterItemUnitDocArray),
    } as any)

    await masterItemUnitService
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
        expect(result.transaction_classify).toEqual('MASTER_ITEM_UNIT_LIST')
        expect(result.message).not.toBe('')
        expect(result.statusCode.customCode).toEqual(modCodes.Global.success)
        expect(result.payload).toBeInstanceOf(Array)
        expect(result.payload).toEqual(masterItemUnitDocArray)
      })
  })

  it(
    testCaption('DATA', 'data', 'Should show master item unit detail'),
    async () => {
      jest.spyOn(masterItemUnitModel, 'findOne').mockReturnValueOnce(
        createMock<Query<MasterItemUnitDocument, MasterItemUnitDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterItemUnitDocArray[0]),
        }) as any
      )

      const findMock = masterItemUnitDocArray[0]
      const foundData = await masterItemUnitService.detail(
        masterItemUnitDocArray[0].id
      )
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master item unit'),
    async () => {
      masterItemUnitModel.create = jest.fn().mockImplementationOnce(() => {
        return Promise.resolve(dataSet)
      })

      jest.spyOn(masterItemUnitModel, 'create')

      const newEntry = (await masterItemUnitService.add(
        mockMasterItemUnit(),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(
    testCaption('DATA', 'data', 'Should edit master item unit data'),
    async () => {
      jest.spyOn(masterItemUnitModel, 'findOneAndUpdate').mockReturnValueOnce(
        createMock<Query<MasterItemUnitDocument, MasterItemUnitDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterItemUnitDocArray[0]),
        }) as any
      )

      const data = (await masterItemUnitService.edit(
        {
          ...mockMasterItemUnit(),
          __v: 0,
        },
        `item_unit-${new Types.ObjectId().toString()}`
      )) satisfies GlobalResponse
      expect(data.payload).toHaveProperty('code')
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
