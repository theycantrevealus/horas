import { AccountService } from '@core/account/account.service'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemUnitController } from '@core/master/controllers/master.item.unit.controller'
import {
  mockMasterItemUnit,
  mockMasterItemUnitService,
} from '@core/master/mock/master.item.unit.mock'
import { MasterItemUnitService } from '@core/master/services/master.item.unit.service'
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

describe('Master Item Unit Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let masterItemUnitController: MasterItemUnitController

  beforeAll(async () => {
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    )
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    masterItemUnitController = app.get<MasterItemUnitController>(
      MasterItemUnitController
    )

    jest.clearAllMocks()
  })

  it(
    testCaption(
      'CONTROLLER STATE',
      'component',
      'Controller should be defined'
    ),
    () => {
      expect(masterItemUnitController).toBeDefined()
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
          url: '/master/unit',
          query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(testCaption('FLOW', 'feature', 'Should return success add'), async () => {
    const data = mockMasterItemUnit()
    return app
      .inject({
        method: 'POST',
        url: '/master/unit',
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return success edit'), async () => {
    const data = {
      ...mockMasterItemUnit(),
      __v: 0,
    }
    const id = `item_unit-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'PATCH',
        url: `/master/unit/${id}`,
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return detail'), async () => {
    const id = `item_unit-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'GET',
        url: `/master/unit/${id}`,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(
    testCaption('FLOW', 'feature', 'Should return success delete'),
    async () => {
      const id = `account-${new Types.ObjectId().toString()}`
      return app
        .inject({
          method: 'DELETE',
          url: `/master/unit/${id}`,
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
