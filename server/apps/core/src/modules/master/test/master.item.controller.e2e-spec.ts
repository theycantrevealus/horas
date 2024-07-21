import { AccountService } from '@core/account/account.service'
import { accountArray } from '@core/account/mock/account.mock'
import { MasterItemController } from '@core/master/controllers/master.item.controller'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import {
  masterItemDocArray,
  mockMasterItem,
  mockMasterItemModel,
} from '@core/master/mock/master.item.mock'
import { MasterItemService } from '@core/master/services/master.item.service'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CanActivate, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { MasterItem, MasterItemDocument } from '@schemas/master/master.item'
import { AuthService } from '@security/auth.service'
import { M_ITEM_SERVICE } from '@utility/constants'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { CommonErrorFilter } from '../../../../../filters/error'
import { GatewayPipe } from '../../../../../pipes/gateway.pipe'

describe('Master Item Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let masterItemController: MasterItemController
  let masterItemModel: Model<MasterItem>
  let logger: Logger

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterItemController],
      providers: [
        MasterItemService,
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Test'),
            set: () => jest.fn().mockResolvedValue('Test'),
          },
        },
        {
          provide: M_ITEM_SERVICE,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            verbose: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => accountArray[0],
            set: () => jest.fn(),
          },
        },
        {
          provide: getModelToken(MasterItem.name, 'primary'),
          useValue: mockMasterItemModel,
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        logger: false,
        disableRequestLogging: true,
        ignoreTrailingSlash: true,
        ignoreDuplicateSlashes: true,
      })
    )
    logger = app.get<Logger>(WINSTON_MODULE_PROVIDER)
    masterItemController = app.get<MasterItemController>(MasterItemController)
    masterItemModel = module.get<Model<MasterItemDocument>>(
      getModelToken(MasterItem.name, 'primary')
    )
    await app.useGlobalFilters(new CommonErrorFilter(logger))
    app.useGlobalPipes(new GatewayPipe())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

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

  describe(
    testCaption('FLOW', 'feature', 'Master Item - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterItemDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/item',
              query: `lazyEvent=abc`,
            })
            .then((result) => {
              expect(result.statusCode).toEqual(HttpStatus.BAD_REQUEST)
              expect(logger.warn).toHaveBeenCalled()
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should return data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterItemDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/item',
              query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
            })
            .then((result) => {
              expect(result.statusCode).toEqual(HttpStatus.OK)
              expect(logger.verbose).toHaveBeenCalled()
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Item - Get data detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should return data', {
          tab: 1,
        }),
        async () => {
          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: `/master/item/${mockMasterItem().id}`,
            })
            .then((result) => {
              expect(result.statusCode).toEqual(HttpStatus.OK)
              expect(logger.verbose).toHaveBeenCalled()
            })
        }
      )
    }
  )

  describe(testCaption('FLOW', 'feature', 'Master Item - Add data'), () => {
    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid format', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: '/master/item',
            body: {},
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.BAD_REQUEST)
            expect(logger.warn).toHaveBeenCalled()
          })
      }
    )

    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid data', {
        tab: 1,
      }),
      async () => {
        const data = {
          code: mockMasterItem().code,
          name: mockMasterItem().name,
          alias: mockMasterItem().alias,
          configuration: mockMasterItem().configuration,
          storing: mockMasterItem().storing,
          category: mockMasterItem().category,
          unit: mockMasterItem().unit,
          brand: mockMasterItem().brand,
          properties: mockMasterItem().properties,
        } satisfies MasterItemAddDTO

        delete data.name

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: '/master/item',
            body: data,
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.BAD_REQUEST)
            expect(logger.warn).toHaveBeenCalled()
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return success add', {
        tab: 1,
      }),
      async () => {
        const data = {
          code: mockMasterItem().code,
          name: mockMasterItem().name,
          alias: mockMasterItem().alias,
          configuration: mockMasterItem().configuration,
          storing: mockMasterItem().storing,
          category: mockMasterItem().category,
          unit: mockMasterItem().unit,
          brand: mockMasterItem().brand,
          properties: mockMasterItem().properties,
        } satisfies MasterItemAddDTO

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: '/master/item',
            body: data,
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.OK)
            expect(logger.verbose).toHaveBeenCalled()
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Master Item - Edit data'), () => {
    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid format', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: `/master/item/${mockMasterItem().id}`,
            body: {},
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.BAD_REQUEST)
            expect(logger.warn).toHaveBeenCalled()
          })
      }
    )

    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid data', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: `/master/item/${mockMasterItem().id}`,
            body: {},
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.BAD_REQUEST)
            expect(logger.warn).toHaveBeenCalled()
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return success edit', {
        tab: 1,
      }),
      async () => {
        const data = {
          code: mockMasterItem().code,
          name: mockMasterItem().name,
          alias: mockMasterItem().alias,
          configuration: mockMasterItem().configuration,
          storing: mockMasterItem().storing,
          category: mockMasterItem().category,
          unit: mockMasterItem().unit,
          brand: mockMasterItem().brand,
          properties: mockMasterItem().properties,
          __v: 0,
        } satisfies MasterItemEditDTO

        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: `/master/item/${mockMasterItem().id}`,
            body: data,
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.OK)
            expect(logger.verbose).toHaveBeenCalled()
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Master Item - Delete data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should return success delete', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: `/master/item/${mockMasterItem().id}`,
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.OK)
            expect(logger.verbose).toHaveBeenCalled()
          })
      }
    )
  })

  afterAll(async () => {
    await app.close()
  })
})
