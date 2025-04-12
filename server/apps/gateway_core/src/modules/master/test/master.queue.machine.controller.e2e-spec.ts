import { CommonErrorFilter } from '@filters/error'
import { accountArray } from '@gateway_core/account/mock/account.mock'
import { MasterQueueMachineController } from '@gateway_core/master/controllers/master.queue.machine.controller'
import {
  MasterQueueMachineAddDTO,
  MasterQueueMachineEditDTO,
} from '@gateway_core/master/dto/master.queue.machine'
import {
  masterQueueDocArray,
  mockMasterQueue,
  mockMasterQueueModel,
} from '@gateway_core/master/mock/master.queue.machine.mock'
import { MasterQueueMachineService } from '@gateway_core/master/services/master.queue.machine.service'
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
import { GatewayPipe } from '@pipes/gateway.pipe'
import { Account } from '@schemas/account/account.model'
import {
  MasterQueueMachine,
  MasterQueueMachineDocument,
} from '@schemas/master/master.queue.machine'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Model } from 'mongoose'
import { Logger } from 'winston'

describe('Master Queue Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let configService: ConfigService
  let masterQueueController: MasterQueueMachineController
  let masterQueueModel: Model<MasterQueueMachine>
  let logger: Logger

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterQueueMachineController],
      providers: [
        MasterQueueMachineService,
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
          provide: getModelToken(MasterQueueMachine.name, 'primary'),
          useValue: mockMasterQueueModel,
        },
        { provide: AuthService, useValue: {} },
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
    configService = module.get<ConfigService>(ConfigService)
    logger = app.get<Logger>(WINSTON_MODULE_PROVIDER)
    masterQueueController = app.get<MasterQueueMachineController>(
      MasterQueueMachineController
    )
    masterQueueModel = module.get<Model<MasterQueueMachineDocument>>(
      getModelToken(MasterQueueMachine.name, 'primary')
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
      expect(masterQueueController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Queue - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterQueueModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterQueueDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
              },
              url: '/master/queue',
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
          jest.spyOn(masterQueueModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterQueueDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
              },
              url: '/master/queue',
              query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Queue - Get data detail'),
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
              url: `/master/queue/${mockMasterQueue().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(testCaption('FLOW', 'feature', 'Master Queue - Add data'), () => {
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
            url: '/master/queue',
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
          code: mockMasterQueue().code,
        }

        delete data.code

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: '/master/queue',
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
          code: mockMasterQueue().code,
          type: [],
        } satisfies MasterQueueMachineAddDTO

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: '/master/queue',
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.CREATED, logger.verbose)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Master Queue - Edit data'), () => {
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
            url: `/master/queue/${mockMasterQueue().id}`,
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
              'Content-Type': 'application/json',
            },
            url: `/master/queue/${mockMasterQueue().id}`,
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
          code: mockMasterQueue().code,
          type: [],
          __v: 0,
        } satisfies MasterQueueMachineEditDTO

        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: `/master/queue/${mockMasterQueue().id}`,
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

  describe(testCaption('FLOW', 'feature', 'Master Queue - Delete data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should return success delete', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(masterQueueModel, 'findOneAndUpdate').mockResolvedValue(null)
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'Content-Type': 'application/json',
            },
            url: `/master/queue/${mockMasterQueue().id}`,
          })
          .then((result) => {
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
        jest
          .spyOn(masterQueueModel, 'findOneAndUpdate')
          .mockResolvedValue(mockMasterQueue())
        return app
          .inject({
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/master/queue/${mockMasterQueue().id}`,
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

  afterAll(async () => {
    await app.close()
  })
})
