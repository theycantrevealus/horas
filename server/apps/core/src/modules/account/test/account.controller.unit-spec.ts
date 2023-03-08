import { AccountController } from '@core/account/account.controller'
import { mockAccountService } from '@core/account/mock/account.mock'
import { accountAddStub, accountStub } from '@core/account/mock/account.stub'
import { Account } from '@core/account/schemas/account.model'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'

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

  it('Controller should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('Controller should be defined', () => {
    expect(service).toBeDefined()
  })

  it('Pass sign in to service', async () => {
    const creator = new Account(accountStub())
    await controller.add(accountAddStub(), creator)
    expect(mockAccountService.add).toHaveBeenCalledWith(
      accountAddStub(),
      creator
    )
  })
})
