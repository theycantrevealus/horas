import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterStockPointAddDTO,
  MasterStockPointEditDTO,
} from '@core/master/dto/master.stock.point'
import { MasterStockPointController } from '@core/master/master.stock.point.controller'
import { MasterStockPointService } from '@core/master/master.stock.point.service'
import {
  mockMasterStockPoint,
  mockMasterStockPointService,
} from '@core/master/mock/master.stock.point.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Master Stock Point Controller', () => {
  let controller: MasterStockPointController
  let service: MasterStockPointService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterStockPointController],
      providers: [
        {
          provide: MasterStockPointService,
          useValue: mockMasterStockPointService,
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<MasterStockPointController>(
      MasterStockPointController
    )
    service = module.get<MasterStockPointService>(MasterStockPointService)

    jest.clearAllMocks()
  })

  it(
    testCaption(
      'CONTROLLER STATE',
      'component',
      'Controller should be defined'
    ),
    () => {
      expect(controller).toBeDefined()
    }
  )

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(service).toBeDefined()
    }
  )

  it(
    testCaption(
      'FLOW',
      'feature',
      'Should pass add to service and logged activity'
    ),
    async () => {
      const creator = mockAccount()
      const data = new MasterStockPointAddDTO(mockMasterStockPoint())
      await controller.add(data, creator)
      expect(mockMasterStockPointService.add).toHaveBeenCalledWith(
        data,
        creator
      )
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new MasterStockPointEditDTO(mockMasterStockPoint())
      const id = `brand-${new Types.ObjectId().toString()}`
      await controller.edit(data, { id: id })
      expect(mockMasterStockPointService.edit).toHaveBeenCalledWith(data, id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = `brand-${new Types.ObjectId().toString()}`
      await controller.detail({ id: id })
      expect(mockMasterStockPointService.detail).toHaveBeenCalledWith(id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `account-${new Types.ObjectId().toString()}`
      await controller.delete({ id: id })
      expect(mockMasterStockPointService.delete).toHaveBeenCalledWith(id)
    }
  )
})
