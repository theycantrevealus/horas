import { CommonErrorFilter } from '@filters/error'
import { AuthorityController } from '@gateway_core/account/authority.controller'
import { AuthorityService } from '@gateway_core/account/authority.service'
import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@gateway_core/account/dto/authority.dto'
import {
  accountArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import {
  authorityDocArray,
  mockAuthority,
  mockAuthorityModel,
} from '@gateway_core/account/mock/authority.mock'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { mockKafkaTransaction } from '@mock/kafka'
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
import { Authority, AuthorityDocument } from '@schemas/account/authority.model'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'
import { Logger } from 'winston'

describe('Authority Controller', () => {
  const mock_Guard: CanActivate = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest()
      request.credential = mockAccount()
      return true
    }),
  }
  let app: NestFastifyApplication
  let configService: ConfigService
  let authorityController: AuthorityController
  let logger: Logger
  let authorityModel: Model<Authority>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorityController],
      providers: [
        AuthorityService,
        {
          provide: 'ACCOUNT_SERVICE',
          useValue: mockKafkaTransaction,
        },
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
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthorityModel,
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
    authorityController = app.get<AuthorityController>(AuthorityController)
    authorityModel = module.get<Model<AuthorityDocument>>(
      getModelToken(Authority.name, 'primary')
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
      expect(authorityController).toBeDefined()
    }
  )

  describe(
    testCaption(
      'FLOW',
      'feature',
      'Authority - Get authority data lazy loaded'
    ),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(authorityModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(authorityDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/authority',
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
          jest.spyOn(authorityModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(authorityDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/authority',
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
    testCaption('FLOW', 'feature', 'Authority - Get data detail'),
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
                'content-type': 'application/json',
              },
              url: `/authority/${mockAuthority().id}`,
            })
            .then((result) => {
              expect(result.statusCode).toEqual(HttpStatus.OK)
              expect(logger.verbose).toHaveBeenCalled()
            })
        }
      )
    }
  )

  describe(testCaption('FLOW', 'feature', 'Authority - Add data'), () => {
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
            url: '/authority',
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
          code: mockAuthority().code,
          name: mockAuthority().name,
          remark: mockAuthority().remark,
        } satisfies AuthorityAddDTO

        delete data.name

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/authority',
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
          code: mockAuthority().code,
          name: mockAuthority().name,
          remark: mockAuthority().remark,
        } satisfies AuthorityAddDTO

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/authority',
            body: data,
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.OK)
            expect(logger.verbose).toHaveBeenCalled()
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Authority - Edit data'), () => {
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
            url: `/authority/${mockAuthority().id}`,
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
              'content-type': 'application/json',
            },
            url: `/authority/${mockAuthority().id}`,
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
          code: mockAuthority().code,
          name: mockAuthority().name,
          remark: mockAuthority().remark,
          __v: 0,
        } satisfies AuthorityEditDTO

        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/authority/${mockAuthority().id}`,
            body: data,
          })
          .then((result) => {
            expect(result.statusCode).toEqual(HttpStatus.OK)
            expect(logger.verbose).toHaveBeenCalled()
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Authority - Delete data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should return success delete', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/authority/${mockAuthority().id}`,
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
