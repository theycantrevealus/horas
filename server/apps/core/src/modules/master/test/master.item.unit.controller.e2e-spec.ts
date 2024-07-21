import { AccountService } from '@core/account/account.service'
import { accountArray } from '@core/account/mock/account.mock'
import { MasterItemUnitController } from '@core/master/controllers/master.item.unit.controller'
import {
  MasterItemUnitAddDTO,
  MasterItemUnitEditDTO,
} from '@core/master/dto/master.item.unit'
import {
  masterItemUnitDocArray,
  mockMasterItemUnit,
  mockMasterItemUnitModel,
} from '@core/master/mock/master.item.unit.mock'
import { MasterItemUnitService } from '@core/master/services/master.item.unit.service'
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
import {
  MasterItemUnit,
  MasterItemUnitDocument,
} from '@schemas/master/master.item.unit'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { CommonErrorFilter } from '../../../../../filters/error'
import { GatewayPipe } from '../../../../../pipes/gateway.pipe'

describe('Master Item Unit Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let masterItemUnitController: MasterItemUnitController
  let masterItemUnitModel: Model<MasterItemUnit>
  let logger: Logger

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterItemUnitController],
      providers: [
        MasterItemUnitService,
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Test'),
            set: () => jest.fn().mockResolvedValue('Test'),
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
          provide: getModelToken(MasterItemUnit.name, 'primary'),
          useValue: mockMasterItemUnitModel,
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
    masterItemUnitController = app.get<MasterItemUnitController>(
      MasterItemUnitController
    )
    masterItemUnitModel = module.get<Model<MasterItemUnitDocument>>(
      getModelToken(MasterItemUnit.name, 'primary')
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
      expect(masterItemUnitController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Item Unit - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemUnitModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterItemUnitDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
              },
              url: '/master/unit',
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
          jest.spyOn(masterItemUnitModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterItemUnitDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
              },
              url: '/master/unit',
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
    testCaption('FLOW', 'feature', 'Master Item Unit - Get data detail'),
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
              },
              url: `/master/unit/${mockMasterItemUnit().id}`,
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
    testCaption('FLOW', 'feature', 'Master Item Unit - Add data'),
    () => {
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
              url: '/master/unit',
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
            code: mockMasterItemUnit().code,
            name: mockMasterItemUnit().name,
          } satisfies MasterItemUnitAddDTO

          delete data.name

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/unit',
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
            code: mockMasterItemUnit().code,
            name: mockMasterItemUnit().name,
          } satisfies MasterItemUnitAddDTO

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/unit',
              body: data,
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
    testCaption('FLOW', 'feature', 'Master Item Unit - Edit data'),
    () => {
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
              url: `/master/unit/${mockMasterItemUnit().id}`,
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
              url: `/master/unit/${mockMasterItemUnit().id}`,
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
            code: mockMasterItemUnit().code,
            name: mockMasterItemUnit().name,
            __v: 0,
          } satisfies MasterItemUnitEditDTO

          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: `/master/unit/${mockMasterItemUnit().id}`,
              body: data,
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
    testCaption('FLOW', 'feature', 'Master Item Unit - Delete data'),
    () => {
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
              url: `/master/unit/${mockMasterItemUnit().id}`,
            })
            .then((result) => {
              expect(result.statusCode).toEqual(HttpStatus.OK)
              expect(logger.verbose).toHaveBeenCalled()
            })
        }
      )
    }
  )

  afterAll(async () => {
    await app.close()
  })
})
