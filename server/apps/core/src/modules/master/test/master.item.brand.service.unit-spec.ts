import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority,mock'
import { Account } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority.model'
import {
  MasterItemBrandAddDTO,
  MasterItemBrandEditDTO,
} from '@core/master/dto/master.item.brand'
import {
  masterItemBrandDocArray,
  mockMasterItemBrand,
  mockMasterItemBrandModel,
} from '@core/master/mock/master.item.brand.mock'
import {
  MasterItemBrand,
  MasterItemBrandDocument,
} from '@core/master/schemas/master.item.brand'
import { MasterItemBrandService } from '@core/master/services/master.item.brand.service'
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
import { testCaption } from '@utility/string'
import { Model, Query, Types } from 'mongoose'

describe('Master Item Brand Service', () => {
  let service: MasterItemBrandService
  let model: Model<MasterItemBrand>
  const dataSet = mockMasterItemBrand()

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemBrandService,
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
          provide: getModelToken(MasterItemBrand.name),
          useValue: mockMasterItemBrandModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: {},
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<MasterItemBrandService>(MasterItemBrandService)
    model = module.get<Model<MasterItemBrandDocument>>(
      getModelToken(MasterItemBrand.name)
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
      exec: jest.fn().mockReturnValue(masterItemBrandDocArray),
    } as any)

    const getData = await service.all({
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {},
    })

    expect(getData.payload.data).toEqual(masterItemBrandDocArray)
  })

  it(
    testCaption('DATA', 'data', 'Should show master item brand detail'),
    async () => {
      jest.spyOn(model, 'findOne').mockReturnValueOnce(
        createMock<Query<MasterItemBrandDocument, MasterItemBrandDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterItemBrandDocArray[0]),
        }) as any
      )

      const findMock = masterItemBrandDocArray[0]
      const foundData = await service.detail(masterItemBrandDocArray[0].id)
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master item brand'),
    async () => {
      model.create = jest.fn().mockImplementationOnce(() => {
        return Promise.resolve(dataSet)
      })

      jest.spyOn(model, 'create')

      const newEntry = (await service.add(
        new MasterItemBrandAddDTO(mockMasterItemBrand()),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(
    testCaption('DATA', 'data', 'Should edit master item brand data'),
    async () => {
      jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
        createMock<Query<MasterItemBrandDocument, MasterItemBrandDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterItemBrandDocArray[0]),
        }) as any
      )

      const data = (await service.edit(
        new MasterItemBrandEditDTO(masterItemBrandDocArray[0]),
        `brand-${new Types.ObjectId().toString()}`
      )) satisfies GlobalResponse
      expect(data.payload).toHaveProperty('code')
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
