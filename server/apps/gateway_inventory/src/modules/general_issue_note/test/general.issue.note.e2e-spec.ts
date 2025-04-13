import { CommonErrorFilter } from '@filters/error'
import { AccountService } from '@gateway_core/account/account.service'
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
  GeneralIssueNote,
  GeneralIssueNoteDocument,
} from '@schemas/inventory/general.issue.note'
import {
  MaterialRequisition,
  MaterialRequisitionDocument,
} from '@schemas/inventory/material.requisition'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { GeneralIssueNoteAddDTO } from '../dto/general.issue.note'
import { GeneralIssueNoteController } from '../general.issue.note.controller'
import { GeneralIssueNoteService } from '../general.issue.note.service'
import {
  mockGeneralIssueNote,
  mockGeneralIssueNoteModel,
} from '../mock/general.issue.note.mock'
import {
  mockMaterialRequisition,
  mockMaterialRequisitionModel,
} from '../mock/material.requisition.mock'

describe('General Issue Note Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let configService: ConfigService
  let generalIssueNoteController: GeneralIssueNoteController
  let generalIssueNoteModel: Model<GeneralIssueNote>
  let materialRequisitionModel: Model<MaterialRequisition>
  let logger: Logger

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneralIssueNoteController],
      providers: [
        GeneralIssueNoteService,
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn(() => Promise.resolve('Asia/Jakarta')),
            // get: () => jest.fn().mockResolvedValue('Asia/Jakarta'),
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
          provide: 'STOCK_SERVICE',
          useValue: {
            send: () => jest.fn(),
            transaction: jest.fn().mockImplementation(() => ({
              send: () => jest.fn(),
              abort: () => jest.fn(),
              commit: () =>
                jest.fn().mockResolvedValue({
                  message: '',
                  transaction_id: '',
                  payload: {},
                }),
            })),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            // get: () => jest.fn(() => Promise.resolve('Asia/Jakarta')),
            get: () => Promise.resolve('Asia/Jakarta'),
            set: () => jest.fn(),
          },
        },
        {
          provide: getModelToken(GeneralIssueNote.name, 'primary'),
          useValue: mockGeneralIssueNoteModel,
        },
        {
          provide: getModelToken(MaterialRequisition.name, 'primary'),
          useValue: mockMaterialRequisitionModel,
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
    generalIssueNoteController = app.get<GeneralIssueNoteController>(
      GeneralIssueNoteController
    )
    generalIssueNoteModel = module.get<Model<GeneralIssueNoteDocument>>(
      getModelToken(GeneralIssueNote.name, 'primary')
    )
    materialRequisitionModel = module.get<Model<MaterialRequisitionDocument>>(
      getModelToken(MaterialRequisition.name, 'primary')
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
      expect(generalIssueNoteController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'General Issue Note - Add data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should return success add', {
          tab: 1,
        }),
        async () => {
          const data = {
            code: mockGeneralIssueNote().code,
            transaction_date: new Date(),
            material_requisition: 'material_requisition-xxx',
            stock_point: {
              id: '',
              code: '',
              name: '',
            },
            detail: [],
            extras: {},
            remark: '-',
          } satisfies GeneralIssueNoteAddDTO

          jest.spyOn(configService, 'get').mockReturnValue('')

          jest
            .spyOn(materialRequisitionModel, 'findOne')
            .mockResolvedValue(mockMaterialRequisition())

          jest.spyOn(generalIssueNoteModel, 'create')

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'Content-Type': 'application/json',
              },
              url: '/inventory/general_issue_note',
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

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })
})
