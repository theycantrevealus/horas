import { AccountService } from '@core/account/account.service'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemSupplierController } from '@core/master/controllers/master.item.supplier.controller'
import {
  mockMasterItemSupplier,
  mockMasterItemSupplierService,
} from '@core/master/mock/master.item.supplier.mock'
import { MasterItemSupplierService } from '@core/master/services/master.item.supplier.service'
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

describe('Master Item Supplier Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let masterItemSupplierController: MasterItemSupplierController

  beforeAll(async () => {
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    )
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    masterItemSupplierController = app.get<MasterItemSupplierController>(
      MasterItemSupplierController
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
      expect(masterItemSupplierController).toBeDefined()
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
          url: '/master/supplier',
          query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(testCaption('FLOW', 'feature', 'Should return success add'), async () => {
    const data = mockMasterItemSupplier()
    return app
      .inject({
        method: 'POST',
        url: '/master/supplier',
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return success edit'), async () => {
    const data = {
      ...mockMasterItemSupplier(),
      __v: 0,
    }
    const id = `supplier-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'PATCH',
        url: `/master/supplier/${id}`,
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return detail'), async () => {
    const id = `supplier-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'GET',
        url: `/master/supplier/${id}`,
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
          url: `/master/supplier/${id}`,
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
