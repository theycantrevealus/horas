import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountService } from '@core/account/account.service'
import {
  accountArray,
  mockAccountModel,
  mockAccountService,
} from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemSupplierAddDTO } from '@core/master/dto/master.item.supplier'
import { MasterItemSupplierController } from '@core/master/master.item.supplier.controller'
import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
import {
  masterItemSupplierArray,
  mockMasterItemSupplierModel,
  mockMasterItemSupplierService,
} from '@core/master/mock/master.item.supplier.mock'
import { MasterItemSupplier } from '@core/master/schemas/master.item.supplier'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  mockLogActivity,
  mockLogActivityModel,
} from '@log/mocks/log.activity.mock'
import { LogActivity, LogActivityDocument } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { INestApplication, VersioningType } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthModule } from '@security/auth.module'
import { AuthService } from '@security/auth.service'
import { environmentIdentifier } from '@utility/environtment'
import { gen_uuid } from '@utility/generator'
import { testCaption } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { Model, Types } from 'mongoose'
import * as request from 'supertest'

function createTestModule(providers, modules, controllers) {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: environmentIdentifier,
        load: [ApplicationConfig, MongoConfig],
      }),
      ...modules,
    ],
    controllers: controllers,
    providers: providers,
  }).compile()
}
describe('Logging Interceptor', () => {
  let app: INestApplication
  let loggingInterceptor: LoggingInterceptor<any>
  let logActivityModel: Model<LogActivity>
  let configService: ConfigService
  let authService: AuthService
  let module: TestingModule
  const idenPass = gen_uuid()
  const TM = new TimeManagement()
  const currentTime = TM.getTimezone('Asia/Jakarta')
  let token = {
    set: '',
    expired_at: new Date(),
  }
  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: environmentIdentifier,
          load: [ApplicationConfig, MongoConfig],
        }),
        AuthModule,
      ],
      providers: [
        {
          provide: LoggingInterceptor,
          useValue: {
            intercept: jest.fn().mockImplementation(() => Promise.resolve()),
            pipe: jest.fn().mockImplementation(() => Promise.resolve()),
          },
        },
        {
          provide: getModelToken(LogActivity.name),
          useValue: mockLogActivityModel,
        },
      ],
    }).compile()

    configService = module.get<ConfigService>(ConfigService)
    authService = module.get<AuthService>(AuthService)
    loggingInterceptor = module.get(LoggingInterceptor)

    logActivityModel = module.get<Model<LogActivityDocument>>(
      getModelToken(LogActivity.name)
    )

    await authService
      .create_token({
        id: idenPass,
        currentTime: currentTime,
        account: {},
      })
      .then((tokenSet) => {
        token = {
          set: tokenSet.token,
          expired_at: tokenSet.expired_at,
        }
      })

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe(
    testCaption(
      'MASTER SUPPLIER CONTROLLER',
      'feature',
      'Master Item Supplier Interceptor'
    ),
    () => {
      it(
        testCaption('Add Master Supplier', 'feature', 'Should log add'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemSupplier.name),
                  useValue: mockMasterItemSupplierModel,
                },
                {
                  provide: getModelToken(Account.name),
                  useValue: mockAccountModel,
                },
                {
                  provide: getModelToken(LogActivity.name),
                  useValue: mockLogActivityModel,
                },
                {
                  provide: getModelToken(LogLogin.name),
                  useValue: {},
                },
                {
                  provide: MasterItemSupplierService,
                  useValue: mockMasterItemSupplierService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemSupplierController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'POST',
            `supplier-${new Types.ObjectId().toString()}`,
            '',
            '',
            '',
            accountArray[0],
            'created',
            0,
            '',
            'I',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .post(`/v1/master/supplier`)
            .set({ Authorization: `Bearer ${token.set}` })
            .send(new MasterItemSupplierAddDTO(masterItemSupplierArray[0]))
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^supplier-/)
              expect(res.body.payload.name).toEqual(
                masterItemSupplierArray[0].name
              )
            })
        }
      )

      it(
        testCaption('Edit Master Supplier', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemSupplier.name),
                  useValue: mockMasterItemSupplierModel,
                },
                {
                  provide: getModelToken(Account.name),
                  useValue: mockAccountModel,
                },
                {
                  provide: getModelToken(LogActivity.name),
                  useValue: mockLogActivityModel,
                },
                {
                  provide: getModelToken(LogLogin.name),
                  useValue: {},
                },
                {
                  provide: MasterItemSupplierService,
                  useValue: mockMasterItemSupplierService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemSupplierController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            masterItemSupplierArray[2].id,
            '',
            '',
            '',
            accountArray[0],
            'created',
            0,
            '',
            'U',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .patch(`/v1/master/supplier/${masterItemSupplierArray[2].id}`)
            .set({ Authorization: `Bearer ${token.set}` })
            .send(masterItemSupplierArray[2])
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )

      it(
        testCaption('Delete Master Supplier', 'feature', 'Should log delete'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemSupplier.name),
                  useValue: mockMasterItemSupplierModel,
                },
                {
                  provide: getModelToken(Account.name),
                  useValue: mockAccountModel,
                },
                {
                  provide: getModelToken(LogActivity.name),
                  useValue: mockLogActivityModel,
                },
                {
                  provide: getModelToken(LogLogin.name),
                  useValue: {},
                },
                {
                  provide: MasterItemSupplierService,
                  useValue: mockMasterItemSupplierService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemSupplierController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            masterItemSupplierArray[0].id,
            '',
            '',
            '',
            accountArray[0],
            'created',
            0,
            '',
            'D',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .delete(`/v1/master/supplier/${masterItemSupplierArray[0].id}`)
            .set({ Authorization: `Bearer ${token.set}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )
})
