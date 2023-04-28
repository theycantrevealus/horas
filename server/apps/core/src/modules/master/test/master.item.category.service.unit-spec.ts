import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@core/master/dto/master.item.category'
import { MasterItemCategoryService } from '@core/master/master.item.category.service'
import {
  masterItemCategoryDocArray,
  mockMasterItemCategory,
  mockMasterItemCategoryModel,
} from '@core/master/mock/master.item.category.mock'
import {
  MasterItemCategory,
  MasterItemCategoryDocument,
} from '@core/master/schemas/master.item.category'
import { createMock } from '@golevelup/ts-jest'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model, Query, Types } from 'mongoose'

describe('Master Item Category Service', () => {
  let service: MasterItemCategoryService
  let model: Model<MasterItemCategory>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemCategoryService,
        AccountService,
        AuthService,
        JwtService,
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
          provide: getModelToken(MasterItemCategory.name),
          useValue: mockMasterItemCategoryModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: {},
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<MasterItemCategoryService>(MasterItemCategoryService)
    model = module.get<Model<MasterItemCategoryDocument>>(
      getModelToken(MasterItemCategory.name)
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(service).toBeDefined()
    }
  )

  it(testCaption('DATA', 'data', 'Should list all data'), async () => {
    jest.spyOn(model, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(masterItemCategoryDocArray),
    } as any)

    const getData = await service.all({
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {},
    })

    expect(getData.payload.data).toEqual(masterItemCategoryDocArray)
  })

  it(
    testCaption('DATA', 'data', 'Should show master item category detail'),
    async () => {
      jest.spyOn(model, 'findOne').mockReturnValueOnce(
        createMock<
          Query<MasterItemCategoryDocument, MasterItemCategoryDocument>
        >({
          exec: jest.fn().mockResolvedValueOnce(masterItemCategoryDocArray[0]),
        }) as any
      )

      const findMock = masterItemCategoryDocArray[0]
      const foundData = await service.detail(masterItemCategoryDocArray[0].id)
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master item category'),
    async () => {
      jest.spyOn(model, 'create').mockImplementationOnce(() => {
        return Promise.resolve(masterItemCategoryDocArray[0])
      })

      const newEntry = (await service.add(
        new MasterItemCategoryAddDTO(mockMasterItemCategory()),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(
    testCaption('DATA', 'data', 'Should edit master item category data'),
    async () => {
      jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
        createMock<
          Query<MasterItemCategoryDocument, MasterItemCategoryDocument>
        >({
          exec: jest.fn().mockResolvedValueOnce(masterItemCategoryDocArray[0]),
        }) as any
      )

      const data = (await service.edit(
        new MasterItemCategoryEditDTO(masterItemCategoryDocArray[0]),
        `category-${new Types.ObjectId().toString()}`
      )) satisfies GlobalResponse
      expect(data.payload).toHaveProperty('code')
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
