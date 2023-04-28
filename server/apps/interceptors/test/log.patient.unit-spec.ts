import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountService } from '@core/account/account.service'
import {
  accountArray,
  mockAccountModel,
  mockAccountService,
} from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { PatientAddDTO } from '@core/patient/dto/patient.add'
import {
  mockPatientModel,
  mockPatientService,
  patientArray,
} from '@core/patient/mock/patient.mock'
import { PatientController } from '@core/patient/patient.controller'
import { PatientService } from '@core/patient/patient.service'
import { Patient } from '@core/patient/schema/patient.model'
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
        envFilePath: `${process.cwd()}/environment/${
          !process.env.NODE_ENV ||
          process.env.NODE_ENV === 'development' ||
          process.env.NODE_ENV === 'test'
            ? ''
            : process.env.NODE_ENV
        }.env`,
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
          envFilePath: `${process.cwd()}/environment/${
            !process.env.NODE_ENV ||
            process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'test'
              ? ''
              : process.env.NODE_ENV
          }.env`,
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
    testCaption('PATIENT CONTROLLER', 'feature', 'Patient Interceptor'),
    () => {
      it(testCaption('Add Patient', 'feature', 'Should log add'), async () => {
        app = (
          await createTestModule(
            [
              {
                provide: getModelToken(Patient.name),
                useValue: mockPatientModel,
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
              { provide: PatientService, useValue: mockPatientService },
              { provide: AccountService, useValue: mockAccountService },
            ],
            [AuthModule],
            [PatientController]
          )
        ).createNestApplication()
        app.enableCors()
        app.enableVersioning({
          type: VersioningType.URI,
        })
        await app.init()

        const dataSet = mockLogActivity(
          'POST',
          patientArray[0].id,
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
          .post(`/v1/patient`)
          .set({ Authorization: `Bearer ${token.set}` })
          .send(new PatientAddDTO(patientArray[0]))
          .then((res) => {
            expect(res.body.payload.id).toMatch(/^patient/)
          })
      })

      it(
        testCaption('Edit Patient', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(Patient.name),
                  useValue: mockPatientModel,
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
                { provide: PatientService, useValue: mockPatientService },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [PatientController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            new Types.ObjectId().toString(),
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
            .patch(`/v1/patient/${patientArray[2].id}`)
            .set({ Authorization: `Bearer ${token.set}` })
            .send(patientArray[2])
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^patient/)
            })
        }
      )

      it(
        testCaption('Delete Patient', 'feature', 'Should log delete'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(Patient.name),
                  useValue: mockPatientModel,
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
                { provide: PatientService, useValue: mockPatientService },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [PatientController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            new Types.ObjectId().toString(),
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
            .delete(`/v1/patient/${patientArray[2].id}`)
            .set({ Authorization: `Bearer ${token.set}` })
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^patient/)
            })
        }
      )
    }
  )
})
