import { CommonErrorFilter } from '@filters/error'
import { AccountService } from '@gateway_core/account/account.service'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { MasterDepartmentController } from '@gateway_core/master/controllers/master.department.controller'
import {
  MasterDepartmentAddDTO,
  MasterDepartmentEditDTO,
} from '@gateway_core/master/dto/master.department'
import {
  masterDepartmentDocArray,
  mockMasterDepartment,
  mockMasterDepartmentModel,
} from '@gateway_core/master/mock/master.department.mock'
import { MasterDepartmentService } from '@gateway_core/master/services/master.department.service'
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
  MasterDepartment,
  MasterDepartmentDocument,
} from '@schemas/master/master.department'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Model } from 'mongoose'
import { Logger } from 'winston'

describe('Master Department Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let configService: ConfigService
  let masterDepartmentController: MasterDepartmentController
  let masterDepartmentModel: Model<MasterDepartment>
  let logger: Logger

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterDepartmentController],
      providers: [
        MasterDepartmentService,
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
          provide: getModelToken(MasterDepartment.name, 'primary'),
          useValue: mockMasterDepartmentModel,
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
    masterDepartmentController = app.get<MasterDepartmentController>(
      MasterDepartmentController
    )
    masterDepartmentModel = module.get<Model<MasterDepartmentDocument>>(
      getModelToken(MasterDepartment.name, 'primary')
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
      expect(masterDepartmentController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Department - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterDepartmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterDepartmentDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/department',
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
          jest.spyOn(masterDepartmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterDepartmentDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/department',
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
    testCaption('FLOW', 'feature', 'Master Department - Get data detail'),
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
              url: `/master/department/${mockMasterDepartment().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Department - Add data'),
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
              url: '/master/department',
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
            code: mockMasterDepartment().code,
            name: mockMasterDepartment().name,
            remark: mockMasterDepartment().remark,
            configuration: {
              default_consultation_treatment: {
                id: '',
                code: '',
                name: '',
              },
              treatment: [
                {
                  id: '',
                  code: '',
                  name: '',
                },
              ],
              doctor: [
                {
                  id: mockAccount().id,
                  first_name: mockAccount().first_name,
                  last_name: mockAccount().last_name,
                  email: mockAccount().email,
                },
              ],
            },
          } satisfies MasterDepartmentAddDTO

          delete data.name

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/department',
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
            code: mockMasterDepartment().code,
            name: mockMasterDepartment().name,
            remark: mockMasterDepartment().remark,
            configuration: {
              default_consultation_treatment: {
                id: 'x',
                code: 'x',
                name: 'x',
              },
              treatment: [
                {
                  id: 'x',
                  code: 'x',
                  name: 'x',
                },
              ],
              doctor: [
                {
                  id: mockAccount().id,
                  first_name: mockAccount().first_name,
                  last_name: mockAccount().last_name,
                  email: mockAccount().email,
                  stock_point: [],
                },
              ],
            },
          } satisfies MasterDepartmentAddDTO

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/master/department',
              body: data,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(
                result,
                HttpStatus.CREATED,
                logger.verbose
              )
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Department - Edit data'),
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
              url: `/master/department/${mockMasterDepartment().id}`,
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
              url: `/master/department/${mockMasterDepartment().id}`,
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
            code: mockMasterDepartment().code,
            name: mockMasterDepartment().name,
            remark: mockMasterDepartment().remark,
            configuration: {
              default_consultation_treatment: {
                id: 'x',
                code: 'x',
                name: 'x',
              },
              treatment: [
                {
                  id: 'x',
                  code: 'x',
                  name: 'x',
                },
              ],
              doctor: [
                {
                  id: mockAccount().id,
                  first_name: mockAccount().first_name,
                  last_name: mockAccount().last_name,
                  email: mockAccount().email,
                  stock_point: [],
                },
              ],
            },
            __v: 0,
          } satisfies MasterDepartmentEditDTO

          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: `/master/department/${mockMasterDepartment().id}`,
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
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Master Department - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should return success delete', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest
            .spyOn(masterDepartmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: `/master/department/${mockMasterDepartment().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(
                result,
                HttpStatus.NOT_FOUND,
                logger.warn
              )
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
            .spyOn(masterDepartmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockMasterDepartment())
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/master/department/${mockMasterDepartment().id}`,
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
    }
  )

  afterAll(async () => {
    await app.close()
  })
})
