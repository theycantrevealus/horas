import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterStockPointAddDTO,
  MasterStockPointEditDTO,
} from '@core/master/dto/master.stock.point'
import { MasterStockPointService } from '@core/master/master.stock.point.service'
import {
  masterStockPointDocArray,
  mockMasterStockPoint,
  mockMasterStockPointModel,
} from '@core/master/mock/master.stock.point.mock'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@core/master/schemas/master.stock.point'
import { createMock } from '@golevelup/ts-jest'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { testCaption } from '@utility/string'
import { Model, Query, Types } from 'mongoose'

describe('Master Stock Point Service', () => {
  let service: MasterStockPointService
  let model: Model<MasterStockPoint>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterStockPointService,
        AccountService,
        AuthService,
        JwtService,
        {
          provide: getModelToken(MasterStockPoint.name),
          useValue: mockMasterStockPointModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: {},
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<MasterStockPointService>(MasterStockPointService)
    model = module.get<Model<MasterStockPointDocument>>(
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
      expect(service).toBeDefined()
    }
  )

  it(testCaption('DATA', 'data', 'Should list all data'), async () => {
    jest.spyOn(model, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(masterStockPointDocArray),
    } as any)

    const getData = await service.all({
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {},
    })

    expect(getData.payload.data).toEqual(masterStockPointDocArray)
  })

  it(
    testCaption('DATA', 'data', 'Should show master stock point detail'),
    async () => {
      jest.spyOn(model, 'findOne').mockReturnValueOnce(
        createMock<Query<MasterStockPointDocument, MasterStockPointDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterStockPointDocArray[0]),
        }) as any
      )

      const findMock = masterStockPointDocArray[0]
      const foundData = await service.detail(masterStockPointDocArray[0].id)
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master stock point'),
    async () => {
      jest.spyOn(model, 'create').mockImplementationOnce(() => {
        return Promise.resolve(masterStockPointDocArray[0])
      })

      const newEntry = (await service.add(
        new MasterStockPointAddDTO(mockMasterStockPoint()),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(
    testCaption('DATA', 'data', 'Should edit master stock point data'),
    async () => {
      jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
        createMock<Query<MasterStockPointDocument, MasterStockPointDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterStockPointDocArray[0]),
        }) as any
      )

      const data = (await service.edit(
        new MasterStockPointEditDTO(masterStockPointDocArray[0]),
        `stock_point-${new Types.ObjectId().toString()}`
      )) satisfies GlobalResponse
      expect(data.payload).toHaveProperty('code')
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
