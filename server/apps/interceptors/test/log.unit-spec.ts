import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountController } from '@core/account/account.controller'
import { AccountService } from '@core/account/account.service'
import {
  accountArray,
  mockAccountModel,
  mockAccountService,
} from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemAddDTO } from '@core/master/dto/master.item'
import { MasterItemBrandAddDTO } from '@core/master/dto/master.item.brand'
import { MasterItemCategoryAddDTO } from '@core/master/dto/master.item.category'
import { MasterItemSupplierAddDTO } from '@core/master/dto/master.item.supplier'
import { MasterItemUnitAddDTO } from '@core/master/dto/master.item.unit'
import { MasterStockPointAddDTO } from '@core/master/dto/master.stock.point'
import { MasterItemBrandController } from '@core/master/master.item.brand.controller'
import { MasterItemBrandService } from '@core/master/master.item.brand.service'
import { MasterItemCategoryController } from '@core/master/master.item.category.controller'
import { MasterItemCategoryService } from '@core/master/master.item.category.service'
import { MasterItemController } from '@core/master/master.item.controller'
import { MasterItemService } from '@core/master/master.item.service'
import { MasterItemSupplierController } from '@core/master/master.item.supplier.controller'
import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
import { MasterItemUnitController } from '@core/master/master.item.unit.controller'
import { MasterItemUnitService } from '@core/master/master.item.unit.service'
import { MasterStockPointController } from '@core/master/master.stock.point.controller'
import { MasterStockPointService } from '@core/master/master.stock.point.service'
import {
  masterItemBrandArray,
  mockMasterItemBrandModel,
  mockMasterItemBrandService,
} from '@core/master/mock/master.item.brand.mock'
import {
  masterItemCategoryArray,
  mockMasterItemCategoryModel,
  mockMasterItemCategoryService,
} from '@core/master/mock/master.item.category.mock'
import {
  masterItemArray,
  mockMasterItemModel,
  mockMasterItemService,
} from '@core/master/mock/master.item.mock'
import {
  masterItemSupplierArray,
  mockMasterItemSupplierModel,
  mockMasterItemSupplierService,
} from '@core/master/mock/master.item.supplier.mock'
import {
  masterItemUnitArray,
  mockMasterItemUnitModel,
  mockMasterItemUnitService,
} from '@core/master/mock/master.item.unit.mock'
import {
  masterStockPointArray,
  mockMasterStockPointModel,
  mockMasterStockPointService,
} from '@core/master/mock/master.stock.point.mock'
import { MasterItem } from '@core/master/schemas/master.item'
import { MasterItemBrand } from '@core/master/schemas/master.item.brand'
import { MasterItemCategory } from '@core/master/schemas/master.item.category'
import { MasterItemSupplier } from '@core/master/schemas/master.item.supplier'
import { MasterItemUnit } from '@core/master/schemas/master.item.unit'
import { MasterStockPoint } from '@core/master/schemas/master.stock.point'
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
  let module: TestingModule
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJmZWQxMDE1LTY5ZjMtNDAxYy04M2M1LTQwNDM2ZmVhNGQzNCIsImN1cnJlbnRUaW1lIjoiMjAyMy0wMy0yNlQwMDoyNTo0MS4wMDBaIiwiYWNjb3VudCI6eyJjcmVhdGVkX2J5Ijp7Il9pZCI6IjYzZDUxZWRlMzI3OTVjYjdhMmEwZWVkZCIsImVtYWlsIjoiam9obmRvZUBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJVUERBVEVESm9obiIsImxhc3RfbmFtZSI6IlVQREFURUREb2UifSwiYWNjZXNzIjpbXSwiX2lkIjoiNjNkNTFlZGUzMjc5NWNiN2EyYTBlZWRkIiwiZW1haWwiOiJqb2huZG9lQGV4YW1wbGUuY29tIiwicGFzc3dvcmQiOiIkMmIkMTAkR1lQWVdvUkg0RG9Gc2dSdU8ucEVidW5PamlGRFl0SktZdk5ud2NZVHFEV3JsbEhxc1VMS0ciLCJmaXJzdF9uYW1lIjoiVVBEQVRFRERKb2huIiwibGFzdF9uYW1lIjoiRG9lVVBEQVRFREQiLCJwaG9uZSI6IjA4MjI5OTY2MzMzMzMiLCJkZWxldGVkX2F0IjpudWxsLCJjcmVhdGVkX2F0IjoiMjAyMy0wMS0yOFQwMToxMDo1NC4wMDBaIiwidXBkYXRlZF9hdCI6IjIwMjMtMDEtMjlUMDI6MjY6MjUuMDAwWiIsIl9fdiI6MjQsImlkIjoiYWNjb3VudC02M2Q1MWVkZTMyNzk1Y2I3YTJhMGVlZGQifSwiaWF0IjoxNjc5NzY1MTQxLCJleHAiOjE2ODIzNTcxNDF9.W0ioCKCJoOMDWL20MoLjGhECVUStbkTU-0F0dsMah70'
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
    loggingInterceptor = module.get(LoggingInterceptor)

    logActivityModel = module.get<Model<LogActivityDocument>>(
      getModelToken(LogActivity.name)
    )
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe(
    testCaption('ACCOUNT CONTROLLER', 'feature', 'Account Interceptor'),
    () => {
      it(testCaption('Add Account', 'feature', 'Should log add'), async () => {
        app = (
          await createTestModule(
            [
              {
                provide: getModelToken(Account.name),
                useValue: mockAccountModel,
              },
              {
                provide: getModelToken(LogActivity.name),
                useValue: mockLogActivityModel,
              },
              {
                provide: getModelToken(Account.name),
                useValue: mockAccountModel,
              },
              {
                provide: getModelToken(LogLogin.name),
                useValue: {},
              },
              { provide: AccountService, useValue: mockAccountService },
            ],
            [AuthModule],
            [AccountController]
          )
        ).createNestApplication()
        app.enableCors()
        app.enableVersioning({
          type: VersioningType.URI,
        })
        await app.init()

        const dataSet = mockLogActivity(
          'POST',
          `account-${new Types.ObjectId().toString()}`,
          '',
          '',
          '',
          accountArray[0],
          0,
          '',
          'I',
          new TimeManagement().getTimezone('Asia/Jakarta')
        )

        jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
          return Promise.resolve(dataSet)
        })

        await request(app.getHttpServer())
          .post(`/v1/account`)
          .set({ Authorization: `Bearer ${token}` })
          .send(accountArray[0])
          .then((res) => {
            expect(res.body.payload.id).toMatch(/^account-/)
            expect(res.body.payload.first_name).toEqual(
              accountArray[0].first_name
            )
          })
      })

      it(
        testCaption('Edit Account', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(Account.name),
                  useValue: mockAccountModel,
                },
                {
                  provide: getModelToken(LogActivity.name),
                  useValue: mockLogActivityModel,
                },
                {
                  provide: getModelToken(Account.name),
                  useValue: mockAccountModel,
                },
                {
                  provide: getModelToken(LogLogin.name),
                  useValue: {},
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [AccountController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            accountArray[2].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'U',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .patch(`/v1/account/${accountArray[2].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .send(accountArray[2])
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )

      it(
        testCaption('Delete Account', 'feature', 'Should log delete'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(Account.name),
                  useValue: mockAccountModel,
                },
                {
                  provide: getModelToken(LogActivity.name),
                  useValue: mockLogActivityModel,
                },
                {
                  provide: getModelToken(Account.name),
                  useValue: mockAccountModel,
                },
                {
                  provide: getModelToken(LogLogin.name),
                  useValue: {},
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [AccountController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            accountArray[0].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'D',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .delete(`/v1/account/${accountArray[0].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )

  describe(
    testCaption(
      'MASTER BRAND CONTROLLER',
      'feature',
      'Master Item Brand Interceptor'
    ),
    () => {
      it(
        testCaption('Add Master Brand', 'feature', 'Should log add'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemBrand.name),
                  useValue: mockMasterItemBrandModel,
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
                  provide: MasterItemBrandService,
                  useValue: mockMasterItemBrandService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemBrandController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'POST',
            `brand-${new Types.ObjectId().toString()}`,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'I',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .post(`/v1/master/brand`)
            .set({ Authorization: `Bearer ${token}` })
            .send(new MasterItemBrandAddDTO(masterItemBrandArray[0]))
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^brand-/)
              expect(res.body.payload.name).toEqual(
                masterItemBrandArray[0].name
              )
            })
        }
      )

      it(
        testCaption('Edit Master Brand', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemBrand.name),
                  useValue: mockMasterItemBrandModel,
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
                  provide: MasterItemBrandService,
                  useValue: mockMasterItemBrandService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemBrandController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            masterItemBrandArray[2].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'U',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .patch(`/v1/master/brand/${masterItemBrandArray[2].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .send(masterItemBrandArray[2])
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )

      it(
        testCaption('Delete Master Brand', 'feature', 'Should log delete'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemBrand.name),
                  useValue: mockMasterItemBrandModel,
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
                  provide: MasterItemBrandService,
                  useValue: mockMasterItemBrandService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemBrandController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            masterItemBrandArray[0].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'D',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .delete(`/v1/master/brand/${masterItemBrandArray[0].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )

  describe(
    testCaption(
      'MASTER UNIT CONTROLLER',
      'feature',
      'Master Item Unit Interceptor'
    ),
    () => {
      it(
        testCaption('Add Master Unit', 'feature', 'Should log add'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemUnit.name),
                  useValue: mockMasterItemUnitModel,
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
                  provide: MasterItemUnitService,
                  useValue: mockMasterItemUnitService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemUnitController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'POST',
            `item_unit-${new Types.ObjectId().toString()}`,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'I',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .post(`/v1/master/unit`)
            .set({ Authorization: `Bearer ${token}` })
            .send(new MasterItemUnitAddDTO(masterItemUnitArray[0]))
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^item_unit-/)
              expect(res.body.payload.name).toEqual(masterItemUnitArray[0].name)
            })
        }
      )

      it(
        testCaption('Edit Master Unit', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemUnit.name),
                  useValue: mockMasterItemUnitModel,
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
                  provide: MasterItemUnitService,
                  useValue: mockMasterItemUnitService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemUnitController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            masterItemUnitArray[2].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'U',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .patch(`/v1/master/unit/${masterItemUnitArray[2].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .send(masterItemUnitArray[2])
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )

      it(
        testCaption('Delete Master Unit', 'feature', 'Should log delete'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemUnit.name),
                  useValue: mockMasterItemUnitModel,
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
                  provide: MasterItemUnitService,
                  useValue: mockMasterItemUnitService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemUnitController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            masterItemUnitArray[0].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'D',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .delete(`/v1/master/unit/${masterItemUnitArray[0].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )

  describe(
    testCaption(
      'MASTER CATEGORY CONTROLLER',
      'feature',
      'Master Item Category Interceptor'
    ),
    () => {
      it(
        testCaption('Add Master Category', 'feature', 'Should log add'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemCategory.name),
                  useValue: mockMasterItemCategoryModel,
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
                  provide: MasterItemCategoryService,
                  useValue: mockMasterItemCategoryService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemCategoryController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'POST',
            `category-${new Types.ObjectId().toString()}`,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'I',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .post(`/v1/master/category`)
            .set({ Authorization: `Bearer ${token}` })
            .send(new MasterItemCategoryAddDTO(masterItemCategoryArray[0]))
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^category-/)
              expect(res.body.payload.name).toEqual(
                masterItemCategoryArray[0].name
              )
            })
        }
      )

      it(
        testCaption('Edit Master Category', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemCategory.name),
                  useValue: mockMasterItemCategoryModel,
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
                  provide: MasterItemCategoryService,
                  useValue: mockMasterItemCategoryService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemCategoryController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            masterItemCategoryArray[2].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'U',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .patch(`/v1/master/category/${masterItemCategoryArray[2].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .send(masterItemCategoryArray[2])
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )

      it(
        testCaption('Delete Master Category', 'feature', 'Should log delete'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItemCategory.name),
                  useValue: mockMasterItemCategoryModel,
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
                  provide: MasterItemCategoryService,
                  useValue: mockMasterItemCategoryService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemCategoryController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            masterItemCategoryArray[0].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'D',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .delete(`/v1/master/category/${masterItemCategoryArray[0].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )

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
            .set({ Authorization: `Bearer ${token}` })
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
            .set({ Authorization: `Bearer ${token}` })
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
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )

  describe(
    testCaption('MASTER ITEM CONTROLLER', 'feature', 'Master Item Interceptor'),
    () => {
      it(
        testCaption('Add Master Item', 'feature', 'Should log add'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItem.name),
                  useValue: mockMasterItemModel,
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
                  provide: MasterItemService,
                  useValue: mockMasterItemService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'POST',
            `item-${new Types.ObjectId().toString()}`,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'I',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .post(`/v1/master/item`)
            .set({ Authorization: `Bearer ${token}` })
            .send(new MasterItemAddDTO(masterItemArray[0]))
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^item-/)
              expect(res.body.payload.name).toEqual(masterItemArray[0].name)
            })
        }
      )

      it(
        testCaption('Edit Master Unit', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItem.name),
                  useValue: mockMasterItemModel,
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
                  provide: MasterItemService,
                  useValue: mockMasterItemService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            masterItemArray[2].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'U',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .patch(`/v1/master/item/${masterItemArray[2].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .send(masterItemArray[2])
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )

      it(
        testCaption('Delete Master Item', 'feature', 'Should log delete'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterItem.name),
                  useValue: mockMasterItemModel,
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
                  provide: MasterItemService,
                  useValue: mockMasterItemService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterItemController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            masterItemArray[0].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'D',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .delete(`/v1/master/item/${masterItemArray[0].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )

  describe(
    testCaption(
      'MASTER STOCK POINT CONTROLLER',
      'feature',
      'Master Stock Point Interceptor'
    ),
    () => {
      it(
        testCaption('Add Stock Point', 'feature', 'Should log add'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterStockPoint.name),
                  useValue: mockMasterStockPointModel,
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
                  provide: MasterStockPointService,
                  useValue: mockMasterStockPointService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterStockPointController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'POST',
            `stock_point-${new Types.ObjectId().toString()}`,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'I',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .post(`/v1/master/stock_point`)
            .set({ Authorization: `Bearer ${token}` })
            .send(new MasterStockPointAddDTO(masterStockPointArray[0]))
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^stock_point-/)
              expect(res.body.payload.name).toEqual(
                masterStockPointArray[0].name
              )
            })
        }
      )

      it(
        testCaption('Edit Master Stock Point', 'feature', 'Should log edit'),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterStockPoint.name),
                  useValue: mockMasterStockPointModel,
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
                  provide: MasterStockPointService,
                  useValue: mockMasterStockPointService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterStockPointController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'PATCH',
            masterStockPointArray[2].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'U',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .patch(`/v1/master/stock_point/${masterStockPointArray[2].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .send(masterStockPointArray[2])
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )

      it(
        testCaption(
          'Delete Master Stock Point',
          'feature',
          'Should log delete'
        ),
        async () => {
          app = (
            await createTestModule(
              [
                {
                  provide: getModelToken(MasterStockPoint.name),
                  useValue: mockMasterStockPointModel,
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
                  provide: MasterStockPointService,
                  useValue: mockMasterStockPointService,
                },
                { provide: AccountService, useValue: mockAccountService },
              ],
              [AuthModule],
              [MasterStockPointController]
            )
          ).createNestApplication()
          app.enableCors()
          app.enableVersioning({
            type: VersioningType.URI,
          })
          await app.init()

          const dataSet = mockLogActivity(
            'DELETE',
            masterStockPointArray[0].id,
            '',
            '',
            '',
            accountArray[0],
            0,
            '',
            'D',
            new TimeManagement().getTimezone('Asia/Jakarta')
          )

          jest.spyOn(logActivityModel, 'create').mockImplementationOnce(() => {
            return Promise.resolve(dataSet)
          })

          await request(app.getHttpServer())
            .delete(`/v1/master/stock_point/${masterStockPointArray[0].id}`)
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toEqual(dataSet.identifier)
            })
        }
      )
    }
  )

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
          .set({ Authorization: `Bearer ${token}` })
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
            .set({ Authorization: `Bearer ${token}` })
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
            .set({ Authorization: `Bearer ${token}` })
            .then((res) => {
              expect(res.body.payload.id).toMatch(/^patient/)
            })
        }
      )
    }
  )
})
