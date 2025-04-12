import { CommonErrorFilter } from '@filters/error'
import {
  accountArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { GatewayPipe } from '@pipes/gateway.pipe'
import { Account } from '@schemas/account/account.model'
import { LOV, LOVDocument } from '@schemas/lov/lov'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { LOVAddDTO, LOVEditDTO } from '../dto/lov'
import { LOVController } from '../lov.controller'
import { LOVService } from '../lov.service'
import { mockLOV, mockLOVDocArray, mockLOVModel } from '../mock/lov.mock'

describe('LOV Controller', () => {
  const mock_Guard: CanActivate = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest()
      request.credential = mockAccount()
      return true
    }),
  }
  let app: NestFastifyApplication
  let configService: ConfigService
  let lovController: LOVController
  let logger: Logger
  let lovModel: Model<LOV>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LOVController],
      providers: [
        LOVService,
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
        { provide: AuthService, useValue: {} },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(LOV.name, 'primary'),
          useValue: mockLOVModel,
        },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
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
    configService = app.get<ConfigService>(ConfigService)
    lovController = app.get<LOVController>(LOVController)
    lovModel = module.get<Model<LOVDocument>>(
      getModelToken(LOV.name, 'primary')
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
      expect(lovController).toBeDefined()
    }
  )

  describe(testCaption('FLOW', 'feature', 'LOV - Get data lazy loaded'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(lovModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(mockLOVDocArray),
        } as any)

        return app
          .inject({
            method: 'GET',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/lov',
            query: `lazyEvent=abc`,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.INTERNAL_SERVER_ERROR,
              null
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(lovModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(mockLOVDocArray),
        } as any)

        return app
          .inject({
            method: 'GET',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/lov',
            query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'LOV - Get data detail'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should return detail data', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'GET',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/lov/${mockLOV().id}`,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'LOV - Add data'), () => {
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
              'content-type': 'application/json',
            },
            url: '/lov',
            body: {},
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid data', {
        tab: 1,
      }),
      async () => {
        const data = {
          group: mockLOV().group,
          name: mockLOV().name,
          parent: mockLOV().parent,
          remark: mockLOV().remark,
        } satisfies LOVAddDTO

        delete data.name

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/lov',
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return success add', {
        tab: 1,
      }),
      async () => {
        const data = {
          group: mockLOV().group,
          name: mockLOV().name,
          parent: mockLOV().parent,
          remark: mockLOV().remark,
        } satisfies LOVAddDTO

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/lov',
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.CREATED, logger.verbose)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'LOV - Edit data'), () => {
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
              'content-type': 'application/json',
            },
            url: `/lov/${mockLOV().id}`,
            body: {},
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
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
              'content-type': 'application/json',
            },
            url: `/lov/${mockLOV().id}`,
            body: {},
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return success edit', {
        tab: 1,
      }),
      async () => {
        const data = {
          group: mockLOV().group,
          name: mockLOV().name,
          parent: mockLOV().parent,
          remark: mockLOV().remark,
          __v: 0,
        } satisfies LOVEditDTO

        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/lov/${mockLOV().id}`,
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.ACCEPTED,
              logger.verbose
            )
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'LOV - Delete data'), () => {
    it(
      testCaption(
        'HANDLING',
        'data',
        'Should return 404 if data is not found',
        {
          tab: 1,
        }
      ),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(lovModel, 'findOneAndUpdate').mockResolvedValue(null)
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/lov/${mockLOV().id}`,
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.NOT_FOUND, logger.warn)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return success delete', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(lovModel, 'findOneAndUpdate').mockResolvedValue(mockLOV())
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/lov/${mockLOV().id}`,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.NO_CONTENT,
              logger.verbose
            )
          })
      }
    )
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })
})
