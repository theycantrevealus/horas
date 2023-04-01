import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemUnitAddDTO,
  MasterItemUnitEditDTO,
} from '@core/master/dto/master.item.unit'
import { MasterItemUnitService } from '@core/master/master.item.unit.service'
import {
  masterItemUnitDocArray,
  mockMasterItemUnit,
  mockMasterItemUnitModel,
} from '@core/master/mock/master.item.unit.mock'
import {
  MasterItemUnit,
  MasterItemUnitDocument,
} from '@core/master/schemas/master.item.unit'
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

describe('Master Item Unit Service', () => {
  let service: MasterItemUnitService
  let model: Model<MasterItemUnit>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemUnitService,
        AccountService,
        AuthService,
        JwtService,
        {
          provide: getModelToken(MasterItemUnit.name),
          useValue: mockMasterItemUnitModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: {},
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<MasterItemUnitService>(MasterItemUnitService)
    model = module.get<Model<MasterItemUnitDocument>>(
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
      expect(service).toBeDefined()
    }
  )

  it(testCaption('DATA', 'data', 'Should list all data'), async () => {
    jest.spyOn(model, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(masterItemUnitDocArray),
    } as any)

    const getData = await service.all({
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {},
    })

    expect(getData.payload.data).toEqual(masterItemUnitDocArray)
  })

  it(
    testCaption('DATA', 'data', 'Should show master item unit detail'),
    async () => {
      jest.spyOn(model, 'findOne').mockReturnValueOnce(
        createMock<Query<MasterItemUnitDocument, MasterItemUnitDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterItemUnitDocArray[0]),
        }) as any
      )

      const findMock = masterItemUnitDocArray[0]
      const foundData = await service.detail(masterItemUnitDocArray[0].id)
      expect(foundData).toEqual(findMock)
    }
  )

  it(
    testCaption('DATA', 'data', 'Should create a new master item unit'),
    async () => {
      jest.spyOn(model, 'create').mockImplementationOnce(() => {
        return Promise.resolve(masterItemUnitDocArray[0])
      })

      const newEntry = (await service.add(
        new MasterItemUnitAddDTO(mockMasterItemUnit()),
        mockAccount()
      )) satisfies GlobalResponse
      expect(newEntry.payload).toHaveProperty('code')
    }
  )

  it(
    testCaption('DATA', 'data', 'Should edit master item unit data'),
    async () => {
      jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
        createMock<Query<MasterItemUnitDocument, MasterItemUnitDocument>>({
          exec: jest.fn().mockResolvedValueOnce(masterItemUnitDocArray[0]),
        }) as any
      )

      const data = (await service.edit(
        new MasterItemUnitEditDTO(masterItemUnitDocArray[0]),
        `item_unit-${new Types.ObjectId().toString()}`
      )) satisfies GlobalResponse
      expect(data.payload).toHaveProperty('code')
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
