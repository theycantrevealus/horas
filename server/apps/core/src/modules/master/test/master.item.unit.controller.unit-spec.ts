import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemUnitAddDTO,
  MasterItemUnitEditDTO,
} from '@core/master/dto/master.item.unit'
import { MasterItemUnitController } from '@core/master/master.item.unit.controller'
import { MasterItemUnitService } from '@core/master/master.item.unit.service'
import {
  mockMasterItemUnit,
  mockMasterItemUnitService,
} from '@core/master/mock/master.item.unit.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Master Item Unit Controller', () => {
  let controller: MasterItemUnitController
  let service: MasterItemUnitService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterItemUnitController],
      providers: [
        {
          provide: MasterItemUnitService,
          useValue: mockMasterItemUnitService,
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<MasterItemUnitController>(MasterItemUnitController)
    service = module.get<MasterItemUnitService>(MasterItemUnitService)

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
      const data = new MasterItemUnitAddDTO(mockMasterItemUnit())
      await controller.add(data, creator)
      expect(mockMasterItemUnitService.add).toHaveBeenCalledWith(data, creator)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new MasterItemUnitEditDTO(mockMasterItemUnit())
      const id = `item_unit-${new Types.ObjectId().toString()}`
      await controller.edit(data, { id: id })
      expect(mockMasterItemUnitService.edit).toHaveBeenCalledWith(data, id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = `item_unit-${new Types.ObjectId().toString()}`
      await controller.detail({ id: id })
      expect(mockMasterItemUnitService.detail).toHaveBeenCalledWith(id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `account-${new Types.ObjectId().toString()}`
      await controller.delete({ id: id })
      expect(mockMasterItemUnitService.delete).toHaveBeenCalledWith(id)
    }
  )
})
