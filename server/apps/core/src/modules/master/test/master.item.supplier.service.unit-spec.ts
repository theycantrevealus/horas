import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
import {
  masterItemSupplierDocArray,
  mockMasterItemSupplier,
  mockMasterItemSupplierModel,
} from '@core/master/mock/master.item.supplier.mock'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@core/master/schemas/master.item.supplier'
import { createMock } from '@golevelup/ts-jest'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CacheModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { testCaption } from '@utility/string'
import * as redisStore from 'cache-manager-ioredis'
import { Model, Query, Types } from 'mongoose'

describe('Master Item Supplier Service', () => {
  let service: MasterItemSupplierService
  let model: Model<MasterItemSupplier>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => {
            return {
              store: redisStore,
              host: configService.get<string>('redis.host'),
              port: configService.get<string>('redis.port'),
              username: configService.get<string>('redis.username'),
              password: configService.get<string>('redis.password'),
              isGlobal: true,
            }
          },
          inject: [ConfigService],
        }),
      ],
      controllers: [],
      providers: [
        MasterItemSupplierService,
        AccountService,
        AuthService,
        JwtService,
        {
          provide: getModelToken(MasterItemSupplier.name),
          useValue: mockMasterItemSupplierModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: {},
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<MasterItemSupplierService>(MasterItemSupplierService)
    model = module.get<Model<MasterItemSupplierDocument>>(
      getModelToken(MasterItemSupplier.name)
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

  it(
    testCaption('DATA', 'data', 'Should list all master item supplier'),
    async () => {
      jest.spyOn(model, 'aggregate').mockReturnValue({
        exec: jest.fn().mockReturnValue(masterItemSupplierDocArray),
      } as any)

      const getData = await service.all({
        first: 0,
        rows: 10,
        sortField: 'created_at',
        sortOrder: 1,
        filters: {},
      })

      expect(getData.payload.data).toEqual(masterItemSupplierDocArray)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should show master item supplier detail'),
    async () => {
      jest.spyOn(model, 'findOne').mockReturnValueOnce(
        createMock<
          Query<MasterItemSupplierDocument, MasterItemSupplierDocument>
        >({
          exec: jest.fn().mockResolvedValueOnce(masterItemSupplierDocArray[0]),
        }) as any
      )

      const findMock = masterItemSupplierDocArray[0]
      const foundData = await service.detail(masterItemSupplierDocArray[0].id)
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master item supplier'),
    async () => {
      jest.spyOn(model, 'create').mockImplementationOnce(() => {
        return Promise.resolve(masterItemSupplierDocArray[0])
      })

      const newEntry = (await service.add(
        new MasterItemSupplierAddDTO({ ...mockMasterItemSupplier(), __v: 0 }),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(
    testCaption('DATA', 'data', 'Should edit master item supplier data'),
    async () => {
      jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
        createMock<
          Query<MasterItemSupplierDocument, MasterItemSupplierDocument>
        >({
          exec: jest.fn().mockResolvedValueOnce(masterItemSupplierDocArray[0]),
        }) as any
      )

      const data = (await service.edit(
        new MasterItemSupplierEditDTO(masterItemSupplierDocArray[0]),
        `supplier-${new Types.ObjectId().toString()}`
      )) satisfies GlobalResponse
      expect(data.payload).toHaveProperty('code')
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
