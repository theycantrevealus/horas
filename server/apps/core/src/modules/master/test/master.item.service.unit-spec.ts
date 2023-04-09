import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import { MasterItemService } from '@core/master/master.item.service'
import {
  masterItemDocArray,
  mockMasterItem,
  mockMasterItemModel,
} from '@core/master/mock/master.item.mock'
import {
  MasterItem,
  MasterItemDocument,
} from '@core/master/schemas/master.item'
import { createMock } from '@golevelup/ts-jest'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { ConfigModule } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { ClientsModule } from '@nestjs/microservices'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { KafkaConn } from '@utility/kafka'
import { testCaption } from '@utility/string'
import { Model, Query, Types } from 'mongoose'

describe('Master Item Service', () => {
  let service: MasterItemService
  let model: Model<MasterItem>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: `${process.cwd()}/environment/${
            process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
          }.env`,
          load: [ApplicationConfig, MongoConfig],
        }),
        ClientsModule.registerAsync([KafkaConn.m_item[0]]),
      ],
      controllers: [],
      providers: [
        MasterItemService,
        AccountService,
        AuthService,
        JwtService,
        {
          provide: getModelToken(MasterItem.name),
          useValue: mockMasterItemModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: {},
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

  it(testCaption('DATA', 'data', 'Should list all data'), async () => {
    jest.spyOn(model, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(masterItemDocArray),
    } as any)

    const getData = await service.all({
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {},
    })

    expect(getData.payload.data).toEqual(masterItemDocArray)
  })

  it(
    testCaption('DATA', 'data', 'Should show master item  detail'),
    async () => {
      jest.spyOn(model, 'findOne').mockReturnValueOnce(
        createMock<Query<MasterItemDocument, MasterItemDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterItemDocArray[0]),
        }) as any
      )

      const findMock = masterItemDocArray[0]
      const foundData = await service.detail(masterItemDocArray[0].id)
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master item '),
    async () => {
      jest.spyOn(model, 'create').mockImplementationOnce(() => {
        return Promise.resolve(masterItemDocArray[0])
      })

      const newEntry = (await service.add(
        new MasterItemAddDTO(mockMasterItem()),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(testCaption('DATA', 'data', 'Should edit master item  data'), async () => {
    jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
      createMock<Query<MasterItemDocument, MasterItemDocument>>({
        exec: jest.fn().mockResolvedValueOnce(masterItemDocArray[0]),
      }) as any
    )

    const data = (await service.edit(
      new MasterItemEditDTO(masterItemDocArray[0]),
      `-${new Types.ObjectId().toString()}`
    )) satisfies GlobalResponse
    expect(data.payload).toHaveProperty('code')
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
