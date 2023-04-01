import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import { MasterItemController } from '@core/master/master.item.controller'
import { MasterItemService } from '@core/master/master.item.service'
import {
  mockMasterItem,
  mockMasterItemService,
} from '@core/master/mock/master.item.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Master Item Controller', () => {
  let controller: MasterItemController
  let service: MasterItemService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterItemController],
      providers: [
        {
          provide: MasterItemService,
          useValue: mockMasterItemService,
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<MasterItemController>(MasterItemController)
    service = module.get<MasterItemService>(MasterItemService)

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
      const data = new MasterItemAddDTO(mockMasterItem())
      await controller.add(data, creator)
      expect(mockMasterItemService.add).toHaveBeenCalledWith(data, creator)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new MasterItemEditDTO(mockMasterItem())
      const id = `item-${new Types.ObjectId().toString()}`
      await controller.edit(data, { id: id })
      expect(mockMasterItemService.edit).toHaveBeenCalledWith(data, id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = `item-${new Types.ObjectId().toString()}`
      await controller.detail({ id: id })
      expect(mockMasterItemService.detail).toHaveBeenCalledWith(id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `item-${new Types.ObjectId().toString()}`
      await controller.delete({ id: id })
      expect(mockMasterItemService.delete).toHaveBeenCalledWith(id)
    }
  )
})
