import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemBrandController } from '@core/master/controllers/master.item.brand.controller'
import {
  MasterItemBrandAddDTO,
  MasterItemBrandEditDTO,
} from '@core/master/dto/master.item.brand'
import {
  mockMasterItemBrand,
  mockMasterItemBrandService,
} from '@core/master/mock/master.item.brand.mock'
import { MasterItemBrandService } from '@core/master/services/master.item.brand.service'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Master Item Brand Controller', () => {
  let controller: MasterItemBrandController
  let service: MasterItemBrandService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterItemBrandController],
      providers: [
        {
          provide: MasterItemBrandService,
          useValue: mockMasterItemBrandService,
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<MasterItemBrandController>(
      MasterItemBrandController
    )
    service = module.get<MasterItemBrandService>(MasterItemBrandService)

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
      const data = new MasterItemBrandAddDTO(mockMasterItemBrand())
      await controller.add(data, creator)
      expect(mockMasterItemBrandService.add).toHaveBeenCalledWith(data, creator)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new MasterItemBrandEditDTO(mockMasterItemBrand())
      const id = `brand-${new Types.ObjectId().toString()}`
      await controller.edit(data, { id: id })
      expect(mockMasterItemBrandService.edit).toHaveBeenCalledWith(data, id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = `brand-${new Types.ObjectId().toString()}`
      await controller.detail({ id: id })
      expect(mockMasterItemBrandService.detail).toHaveBeenCalledWith(id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `account-${new Types.ObjectId().toString()}`
      await controller.delete({ id: id })
      expect(mockMasterItemBrandService.delete).toHaveBeenCalledWith(id)
    }
  )
})
