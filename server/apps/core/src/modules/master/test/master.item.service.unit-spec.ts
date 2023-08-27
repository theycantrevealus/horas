import { AccountService } from '@core/account/account.service'
import { mockAccountModel } from '@core/account/mock/account.mock'
import { mockAuthorityModel } from '@core/account/mock/authority,mock'
import { Account } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority'
import {
  mockMasterItem,
  mockMasterItemModel,
} from '@core/master/mock/master.item.mock'
import {
  MasterItem,
  MasterItemDocument,
} from '@core/master/schemas/master.item'
import { MasterItemService } from '@core/master/services/master.item.service'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { M_ITEM_SERVICE } from '@utility/constants'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Item Service', () => {
  let service: MasterItemService
  let model: Model<MasterItem>
  const dataSet = mockMasterItem()

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemService,
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
          provide: M_ITEM_SERVICE,
          useValue: {
            emit: jest.fn(),
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
          provide: getModelToken(MasterItem.name),
          useValue: mockMasterItemModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthorityModel,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<MasterItemService>(MasterItemService)
    model = module.get<Model<MasterItemDocument>>(
      getModelToken(MasterItem.name)
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

  // it(testCaption('DATA', 'data', 'Should list all data'), async () => {
  //   jest.spyOn(model, 'aggregate').mockReturnValue({
  //     exec: jest.fn().mockReturnValue(masterItemDocArray),
  //   } as any)
  //
  //   const getData = await service.all({
  //     first: 0,
  //     rows: 10,
  //     sortField: 'created_at',
  //     sortOrder: 1,
  //     filters: {},
  //   })
  //
  //   expect(getData.payload.data).toEqual(masterItemDocArray)
  // })
  //
  // it(
  //   testCaption('DATA', 'data', 'Should show master item  detail'),
  //   async () => {
  //     jest.spyOn(model, 'findOne').mockReturnValueOnce(
  //       createMock<Query<MasterItemDocument, MasterItemDocument>>({
  //         exec: jest.fn().mockResolvedValueOnce(masterItemDocArray[0]),
  //       }) as any
  //     )
  //
  //     const findMock = masterItemDocArray[0]
  //     const foundData = await service.detail(masterItemDocArray[0].id)
  //     expect(foundData).toEqual(findMock)
  //   }
  // )
  //
  // it(
  //   testCaption('DATA', 'data', 'Should create a new master item '),
  //   async () => {
  //     model.create = jest.fn().mockImplementationOnce(() => {
  //       return Promise.resolve(dataSet)
  //     })
  //
  //     jest.spyOn(model, 'create')
  //
  //     const newEntry = (await service.add(
  //       new MasterItemAddDTO(mockMasterItem()),
  //       mockAccount()
  //     )) satisfies GlobalResponse
  //     expect(newEntry.payload).toHaveProperty('code')
  //   }
  // )
  //
  // it(testCaption('DATA', 'data', 'Should edit master item  data'), async () => {
  //   jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
  //     createMock<Query<MasterItemDocument, MasterItemDocument>>({
  //       exec: jest.fn().mockResolvedValueOnce(masterItemDocArray[0]),
  //     }) as any
  //   )
  //
  //   const data = (await service.edit(
  //     new MasterItemEditDTO(masterItemDocArray[0]),
  //     `-${new Types.ObjectId().toString()}`
  //   )) satisfies GlobalResponse
  //   expect(data.payload).toHaveProperty('code')
  // })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
