import { AccountController } from '@core/account/account.controller'
import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountEditDTO } from '@core/account/dto/account.edit'
import {
  accountDocArray,
  mockAccount,
  mockAccountService,
} from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

import { AccountService } from '../account.service'

describe('Account Controller', () => {
  let controller: AccountController
  let service: AccountService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        { provide: AccountService, useValue: mockAccountService },
        { provide: AuthService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<AccountController>(AccountController)
    service = module.get<AccountService>(AccountService)

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
      const data = new AccountAddDTO({ ...mockAccount(), __v: 0 })
      await controller.add(data, creator)
      expect(mockAccountService.add).toHaveBeenCalledWith(data, creator)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new AccountEditDTO({
        email: accountDocArray[1].email,
        first_name: accountDocArray[1].first_name,
        last_name: accountDocArray[1].last_name,
        phone: accountDocArray[1].phone,
        __v: 0,
      })
      const id = new Types.ObjectId().toString()
      await controller.edit(data, { _id: id })
      expect(mockAccountService.edit).toHaveBeenCalledWith(data, id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = new Types.ObjectId().toString()
      await controller.detail({ _id: id })
      expect(mockAccountService.detail).toHaveBeenCalledWith(id)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = new Types.ObjectId().toString()
      await controller.delete({ _id: id })
      expect(mockAccountService.delete).toHaveBeenCalledWith(id)
    }
  )
})
