import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemSupplierController } from '@core/master/controllers/master.item.supplier.controller'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import {
  mockMasterItemSupplier,
  mockMasterItemSupplierService,
} from '@core/master/mock/master.item.supplier.mock'
import { MasterItemSupplierService } from '@core/master/services/master.item.supplier.service'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Master Item Supplier Controller', () => {
  let controller: MasterItemSupplierController
  let service: MasterItemSupplierService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterItemSupplierController],
      providers: [
        {
          provide: MasterItemSupplierService,
          useValue: mockMasterItemSupplierService,
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<MasterItemSupplierController>(
      MasterItemSupplierController
    )
    service = module.get<MasterItemSupplierService>(MasterItemSupplierService)

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
      const data = new MasterItemSupplierAddDTO(mockMasterItemSupplier())
      await controller.add(data, creator)
      expect(mockMasterItemSupplierService.add).toHaveBeenCalledWith(
        data,
        creator
      )
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new MasterItemSupplierEditDTO(mockMasterItemSupplier())
      const id = `supplier-${new Types.ObjectId().toString()}`
      await controller.edit(data, { id: id })
      expect(mockMasterItemSupplierService.edit).toHaveBeenCalledWith(data, id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = `supplier-${new Types.ObjectId().toString()}`
      await controller.detail({ id: id })
      expect(mockMasterItemSupplierService.detail).toHaveBeenCalledWith(id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `account-${new Types.ObjectId().toString()}`
      await controller.delete({ id: id })
      expect(mockMasterItemSupplierService.delete).toHaveBeenCalledWith(id)
    }
  )
})
