import { ConsumerStockService } from '@consumer_stock/consumer_stock.service'
import { StockLogDTO } from '@consumer_stock/dto/stock.log.dto'
import { mockInventoryStockModel } from '@consumer_stock/mock/stock.mock'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { Authority } from '@schemas/account/authority.model'
import {
  InventoryStock,
  InventoryStockDocument,
} from '@schemas/inventory/stock'
import {
  InventoryStockLog,
  InventoryStockLogDocument,
} from '@schemas/inventory/stock.log'
import { MasterStockPoint } from '@schemas/master/master.stock.point'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { Connection, Model } from 'mongoose'

describe('Stock Consumer Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let consumerStockService: ConsumerStockService
  let mongoTransaction: Connection
  let inventoryStockModel: Model<InventoryStock>
  let inventoryStockLogModel: Model<InventoryStockLog>
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        ConsumerStockService,
        AuthService,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Test'),
            set: () => jest.fn().mockResolvedValue('Test'),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => '',
            set: () => jest.fn(),
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
          provide: getConnectionToken('primary'),
          useValue: {
            collection: jest.fn().mockReturnThis(),
            db: {
              collection: jest.fn().mockReturnThis(),
            },
            startSession: jest.fn().mockImplementation(() => ({
              withTransaction: jest.fn(),
              endSession: jest.fn(),
            })),
          },
        },
        {
          provide: getModelToken(InventoryStock.name, 'primary'),
          useValue: mockInventoryStockModel,
        },
        {
          provide: getModelToken(MasterStockPoint.name, 'primary'),
          useValue: {},
        },
        {
          provide: getModelToken(InventoryStockLog.name, 'primary'),
          useValue: {},
        },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: {},
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: {},
        },
        {
          provide: getModelToken(LogActivity.name, 'primary'),
          useValue: {},
        },
        {
          provide: getModelToken(LogLogin.name, 'primary'),
          useValue: {},
        },
      ],
    }).compile()

    configService = module.get<ConfigService>(ConfigService)

    consumerStockService =
      module.get<ConsumerStockService>(ConsumerStockService)
    inventoryStockModel = module.get<Model<InventoryStockDocument>>(
      getModelToken(InventoryStock.name, 'primary')
    )
    mongoTransaction = module.get(getConnectionToken('primary'))
    inventoryStockLogModel = module.get<Model<InventoryStockLogDocument>>(
      getModelToken(InventoryStockLog.name, 'primary')
    )

    cacheManager = module.get(CACHE_MANAGER)

    jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(consumerStockService).toBeDefined()
      expect(inventoryStockModel).toBeDefined()
      expect(inventoryStockLogModel).toBeDefined()
    }
  )

  describe(
    testCaption('PROCESS DATA', 'data', 'Consumer Stock - Stock Movement'),
    () => {
      // it(
      //   testCaption(
      //     'DATA',
      //     'data',
      //     'Should throw error if both origin stock point and target stock point is undefined'
      //   ),
      //   async () => {
      //     jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

      //     // jest.spyOn(cacheManager, 'get').mockImplementationOnce(() => {
      //     //   throw new Error(JSON.stringify(mockError))
      //     // })

      //     const payload: StockLogDTO = {
      //       from: null,
      //       to: null,
      //       batch: {
      //         id: '',
      //         code: '',
      //         item: {
      //           id: '',
      //           code: '',
      //           name: '',
      //           brand: null,
      //         },
      //         price_buy: 10,
      //         price_sell: 11,
      //         expired: new Date(),
      //       },
      //       qty: 10,
      //       transaction_id: '',
      //     }

      //     // const session = jest.spyOn(mongoTransaction, 'startSession')
      //     const session = await mongoTransaction.startSession()
      //     const result = await session.withTransaction(async () => {})
      //     // const withTransaction = jest.spyOn(session, 'withTransaction')

      //     await consumerStockService
      //       .movement(payload, mockAccount())
      //       .then((checkRes) => {
      //         console.log(checkRes)
      //       })
      //       .catch((errorRes) => {
      //         console.log(errorRes)
      //       })

      //     await expect(
      //       await consumerStockService.movement(payload, mockAccount())
      //     ).rejects.toThrow(ForbiddenException)
      //   }
      // )

      it(
        testCaption('DATA', 'data', 'Should proceed using transaction'),
        async () => {
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})

          const session = jest.spyOn(mongoTransaction, 'startSession')

          const payload: StockLogDTO = {
            from: mockMasterStockPoint(),
            to: mockMasterStockPoint(),
            batch: {
              id: '',
              code: '',
              item: {
                id: '',
                code: '',
                name: '',
                brand: null,
              },
              price_buy: 10,
              price_sell: 11,
              expired: new Date(),
            },
            qty: 10,
            transaction_id: '',
          }
          await consumerStockService
            .movement(payload, mockAccount())
            .then(() => {
              expect(session).toHaveBeenCalled()
            })
        }
      )
    }
  )

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
