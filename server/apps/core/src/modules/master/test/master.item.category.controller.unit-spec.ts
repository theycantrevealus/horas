import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@core/master/dto/master.item.category'
import { MasterItemCategoryController } from '@core/master/master.item.category.controller'
import { MasterItemCategoryService } from '@core/master/master.item.category.service'
import {
  mockMasterItemCategory,
  mockMasterItemCategoryService,
} from '@core/master/mock/master.item.category.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Master Item Category Controller', () => {
  let controller: MasterItemCategoryController
  let service: MasterItemCategoryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterItemCategoryController],
      providers: [
        {
          provide: MasterItemCategoryService,
          useValue: mockMasterItemCategoryService,
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<MasterItemCategoryController>(
      MasterItemCategoryController
    )
    service = module.get<MasterItemCategoryService>(MasterItemCategoryService)

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
      const data = new MasterItemCategoryAddDTO(mockMasterItemCategory())
      await controller.add(data, creator)
      expect(mockMasterItemCategoryService.add).toHaveBeenCalledWith(
        data,
        creator
      )
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new MasterItemCategoryEditDTO(mockMasterItemCategory())
      const id = `category-${new Types.ObjectId().toString()}`
      await controller.edit(data, { id: id })
      expect(mockMasterItemCategoryService.edit).toHaveBeenCalledWith(data, id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = `category-${new Types.ObjectId().toString()}`
      await controller.detail({ id: id })
      expect(mockMasterItemCategoryService.detail).toHaveBeenCalledWith(id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `account-${new Types.ObjectId().toString()}`
      await controller.delete({ id: id })
      expect(mockMasterItemCategoryService.delete).toHaveBeenCalledWith(id)
    }
  )
})
