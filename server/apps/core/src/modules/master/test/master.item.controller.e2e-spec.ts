import { AccountService } from '@core/account/account.service'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemController } from '@core/master/controllers/master.item.controller'
import {
  mockMasterItem,
  mockMasterItemService,
} from '@core/master/mock/master.item.mock'
import { MasterItemService } from '@core/master/services/master.item.service'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { CanActivate } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Master Item Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let masterItemController: MasterItemController

  beforeAll(async () => {
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    )
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    masterItemController = app.get<MasterItemController>(MasterItemController)

    jest.clearAllMocks()
  })

  it(
    testCaption(
      'CONTROLLER STATE',
      'component',
      'Controller should be defined'
    ),
    () => {
      expect(masterItemController).toBeDefined()
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should return data', {
      tab: 0,
    }),
    async () => {
      return app
        .inject({
          method: 'GET',
          url: '/master/item',
          query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(testCaption('FLOW', 'feature', 'Should return success add'), async () => {
    const data = mockMasterItem()
    return app
      .inject({
        method: 'POST',
        url: '/master/item',
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return success edit'), async () => {
    const data = {
      ...mockMasterItem(),
      __v: 0,
    }
    const id = `item-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'PATCH',
        url: `/master/item/${id}`,
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return detail'), async () => {
    const id = `item-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'GET',
        url: `/master/item/${id}`,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `item-${new Types.ObjectId().toString()}`
      return app
        .inject({
          method: 'DELETE',
          url: `/master/item/${id}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  afterAll(async () => {
    await app.close()
  })
})
