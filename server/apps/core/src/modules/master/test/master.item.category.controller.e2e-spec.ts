import { AccountService } from '@core/account/account.service'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemCategoryController } from '@core/master/controllers/master.item.category.controller'
import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@core/master/dto/master.item.category'
import {
  mockMasterItemCategory,
  mockMasterItemCategoryService,
} from '@core/master/mock/master.item.category.mock'
import { MasterItemCategoryService } from '@core/master/services/master.item.category.service'
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

describe('Master Item Category Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let controller: MasterItemCategoryController

  beforeAll(async () => {
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    )
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    controller = app.get<MasterItemCategoryController>(
      MasterItemCategoryController
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
      expect(controller).toBeDefined()
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
          url: '/master/category',
          query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(testCaption('FLOW', 'feature', 'Should return success add'), async () => {
    const data = new MasterItemCategoryAddDTO(mockMasterItemCategory())
    return app
      .inject({
        method: 'POST',
        url: '/master/category',
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return success edit'), async () => {
    const data = new MasterItemCategoryEditDTO(mockMasterItemCategory())
    const id = `category-${new Types.ObjectId().toString()}`

    return app
      .inject({
        method: 'PATCH',
        url: `/master/category/${id}`,
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(testCaption('FLOW', 'feature', 'Should return detail'), async () => {
    const id = `category-${new Types.ObjectId().toString()}`
    return app
      .inject({
        method: 'GET',
        url: `/master/category/${id}`,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `category-${new Types.ObjectId().toString()}`
      return app
        .inject({
          method: 'DELETE',
          url: `/master/category/${id}`,
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
