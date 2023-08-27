import { AccountService } from '@core/account/account.service'
import { mockAccount, mockAccountModel } from '@core/account/mock/account.mock'
import { mockAuthorityModel } from '@core/account/mock/authority,mock'
import { Account } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import {
  masterItemSupplierDocArray,
  mockMasterItemSupplier,
  mockMasterItemSupplierModel,
} from '@core/master/mock/master.item.supplier.mock'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@core/master/schemas/master.item.supplier'
import { MasterItemSupplierService } from '@core/master/services/master.item.supplier.service'
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

describe('Master Item Supplier Service', () => {
  let service: MasterItemSupplierService
  let model: Model<MasterItemSupplier>
  const dataSet = mockMasterItemSupplier()

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemSupplierService,
        AccountService,
        AuthService,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => {
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
          provide: getModelToken(MasterItemSupplier.name),
          useValue: mockMasterItemSupplierModel,
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
      model.create = jest.fn().mockImplementationOnce(() => {
        return Promise.resolve(dataSet)
      })

      jest.spyOn(model, 'create')

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
