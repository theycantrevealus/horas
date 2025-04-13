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
import { i18n, i18nDocument } from '@schemas/i18n/i18n'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { i18nAddDTO, i18nEditDTO } from '../dto/i18n'
import { I18nController } from '../i18n.controller'
import { I18nService } from '../i18n.service'
import { i18nDocArray, mocki18n, mocki18nModel } from '../mock/i18n.mock'

describe('i18n Controller', () => {
  const mock_Guard: CanActivate = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest()
      request.credential = mockAccount()
      return true
    }),
  }
  let app: NestFastifyApplication
  let configService: ConfigService
  let i18nController: I18nController
  let logger: Logger
  let i18nModel: Model<i18n>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [I18nController],
      providers: [
        I18nService,
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
          provide: getModelToken(i18n.name, 'primary'),
          useValue: mocki18nModel,
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
    i18nController = app.get<I18nController>(I18nController)
    i18nModel = module.get<Model<i18nDocument>>(
      getModelToken(i18n.name, 'primary')
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
      expect(i18nController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'i18n - Get  data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(i18nModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(i18nDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/i18n',
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
          jest.spyOn(i18nModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(i18nDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/i18n',
              query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(testCaption('FLOW', 'feature', 'i18n - Get data detail'), () => {
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
            url: `/i18n/${mocki18n().id}`,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'i18n - Add data'), () => {
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
            url: '/i18n',
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
          language_code: mocki18n().language_code,
          iso_2_digits: mocki18n().iso_2_digits,
          iso_3_digits: mocki18n().iso_3_digits,
          name: mocki18n().name,
          datetime: {
            short: {
              weekday: 'long' as const,
              era: 'short' as const,
              year: 'numeric' as const,
              month: 'short' as const,
              day: 'numeric' as const,
              hour: 'numeric' as const,
              minute: 'numeric' as const,
              second: 'numeric' as const,
              timezone_name: 'long' as const,
            },
            long: {
              weekday: 'short' as const,
              era: 'short' as const,
              year: 'numeric' as const,
              month: 'short' as const,
              day: 'numeric' as const,
              hour: 'numeric' as const,
              minute: 'numeric' as const,
              second: 'numeric' as const,
              timezone_name: 'long' as const,
            },
          },
          number: mocki18n().number,
          components: mocki18n().components,
          remark: mocki18n().remark,
        } satisfies i18nAddDTO

        delete data.name

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/i18n',
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
          language_code: mocki18n().language_code,
          iso_2_digits: mocki18n().iso_2_digits,
          iso_3_digits: mocki18n().iso_3_digits,
          name: mocki18n().name,
          datetime: {
            short: {
              weekday: 'long' as const,
              era: 'short' as const,
              year: 'numeric' as const,
              month: 'short' as const,
              day: 'numeric' as const,
              hour: 'numeric' as const,
              minute: 'numeric' as const,
              second: 'numeric' as const,
              timezone_name: 'long' as const,
            },
            long: {
              weekday: 'short' as const,
              era: 'short' as const,
              year: 'numeric' as const,
              month: 'short' as const,
              day: 'numeric' as const,
              hour: 'numeric' as const,
              minute: 'numeric' as const,
              second: 'numeric' as const,
              timezone_name: 'long' as const,
            },
          },
          number: mocki18n().number,
          components: mocki18n().components,
          remark: mocki18n().remark,
        } satisfies i18nAddDTO

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/i18n',
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.CREATED, logger.verbose)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'i18n - Edit data'), () => {
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
            url: `/i18n/${mocki18n().id}`,
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
            url: `/i18n/${mocki18n().id}`,
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
          language_code: mocki18n().language_code,
          iso_2_digits: mocki18n().iso_2_digits,
          iso_3_digits: mocki18n().iso_3_digits,
          name: mocki18n().name,
          datetime: {
            short: {
              weekday: 'long' as const,
              era: 'short' as const,
              year: 'numeric' as const,
              month: 'short' as const,
              day: 'numeric' as const,
              hour: 'numeric' as const,
              minute: 'numeric' as const,
              second: 'numeric' as const,
              timezone_name: 'long' as const,
            },
            long: {
              weekday: 'short' as const,
              era: 'short' as const,
              year: 'numeric' as const,
              month: 'short' as const,
              day: 'numeric' as const,
              hour: 'numeric' as const,
              minute: 'numeric' as const,
              second: 'numeric' as const,
              timezone_name: 'long' as const,
            },
          },
          number: mocki18n().number,
          components: mocki18n().components,
          remark: mocki18n().remark,
          __v: 0,
        } satisfies i18nEditDTO

        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/i18n/${mocki18n().id}`,
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

  describe(testCaption('FLOW', 'feature', 'i18n - Delete data'), () => {
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
        jest.spyOn(i18nModel, 'findOneAndUpdate').mockResolvedValue(null)
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/i18n/${mocki18n().id}`,
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
        jest.spyOn(i18nModel, 'findOneAndUpdate').mockResolvedValue(mocki18n())
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/i18n/${mocki18n().id}`,
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
