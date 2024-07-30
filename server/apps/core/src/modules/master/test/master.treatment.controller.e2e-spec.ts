import { AccountService } from '@core/account/account.service'
import { MasterTreatmentController } from '@core/master/controllers/master.treatment.controller'
import {
  MasterTreatmentAddDTO,
  MasterTreatmentEditDTO,
} from '@core/master/dto/master.treatment'
import {
  masterTreatmentDocArray,
  mockMasterTreatment,
  mockMasterTreatmentModel,
} from '@core/master/mock/master.treatment.mock'
import { MasterTreatmentService } from '@core/master/services/master.treatment.service'
import { CommonErrorFilter } from '@filters/error'
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
  MasterTreatment,
  MasterTreatmentDocument,
} from '@schemas/master/master.treatment'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'
import { Logger } from 'winston'

describe('Master Treatment Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let configService: ConfigService
  let masterTreatmentController: MasterTreatmentController
  let masterTreatmentModel: Model<MasterTreatment>
  let logger: Logger

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterTreatmentController],
      providers: [
        MasterTreatmentService,
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Asia/Jakarta'),
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
            get: () => 'Asia/Jakarta',
            set: () => jest.fn(),
          },
        },
        {
          provide: getModelToken(MasterTreatment.name, 'primary'),
          useValue: mockMasterTreatmentModel, // TODO : Create mock here
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
    configService = app.get<ConfigService>(ConfigService)
    masterTreatmentController = app.get<MasterTreatmentController>(
      MasterTreatmentController
    )
    masterTreatmentModel = module.get<Model<MasterTreatmentDocument>>(
      getModelToken(MasterTreatment.name, 'primary')
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
      expect(masterTreatmentController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Treatment - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterTreatmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterTreatmentDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/treatment',
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
          jest.spyOn(masterTreatmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterTreatmentDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/treatment',
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
    testCaption('FLOW', 'feature', 'Master Treatment - Get data detail'),
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
              url: `/master/treatment/${mockMasterTreatment().id}`,
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
    testCaption('FLOW', 'feature', 'Master Treatment - Add data'),
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
              url: '/master/treatment',
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
            code: mockMasterTreatment().code,
            name: mockMasterTreatment().name,
            remark: mockMasterTreatment().remark,
            group: [],
            rate: [],
            partner: [],
          } satisfies MasterTreatmentAddDTO

          delete data.name

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/treatment',
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
            code: mockMasterTreatment().code,
            name: mockMasterTreatment().name,
            remark: mockMasterTreatment().remark,
            group: [],
            rate: [],
            partner: [],
            __v: 1,
          } satisfies MasterTreatmentEditDTO

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/treatment',
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
    testCaption('FLOW', 'feature', 'Master Treatment - Edit data'),
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
              url: `/master/treatment/${mockMasterTreatment().id}`,
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
              url: `/master/treatment/${mockMasterTreatment().id}`,
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
            code: mockMasterTreatment().code,
            name: mockMasterTreatment().name,
            remark: mockMasterTreatment().remark,
            group: [],
            rate: [],
            partner: [],
            __v: 0,
          } satisfies MasterTreatmentEditDTO

          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: `/master/treatment/${mockMasterTreatment().id}`,
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
    testCaption('FLOW', 'feature', 'Master Treatment - Delete data'),
    () => {
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
                'Content-Type': 'application/json',
              },
              url: `/master/treatment/${mockMasterTreatment().id}`,
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
