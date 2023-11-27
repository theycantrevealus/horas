import { AccountService } from '@core/account/account.service'
import { Account } from '@core/account/schemas/account.model'
import { MasterStockPointController } from '@core/master/controllers/master.stock.point.controller'
import {
  mockMasterStockPoint,
  mockMasterStockPointService,
} from '@core/master/mock/master.stock.point.mock'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
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

describe('Master Stock Point Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let masterStockPointController: MasterStockPointController

  beforeAll(async () => {
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    )
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    masterStockPointController = app.get<MasterStockPointController>(
      MasterStockPointController
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
      expect(masterStockPointController).toBeDefined()
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
          url: '/master/stock_point',
          query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(testCaption('FLOW', 'feature', 'Should return success add'), async () => {
    const data = mockMasterStockPoint()
    return app
      .inject({
        method: 'POST',
        url: '/master/stock_point',
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return success edit'), async () => {
    const data = {
      ...mockMasterStockPoint(),
      __v: 0,
    }
    const id = `stock_point-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'PATCH',
        url: `/master/stock_point/${id}`,
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return detail'), async () => {
    const id = `stock_point-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'GET',
        url: `/master/stock_point/${id}`,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `stock_point-${new Types.ObjectId().toString()}`
      return app
        .inject({
          method: 'DELETE',
          url: `/master/stock_point/${id}`,
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
