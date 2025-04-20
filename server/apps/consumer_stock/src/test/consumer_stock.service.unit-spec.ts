import { ConsumerStockService } from '@consumer_stock/consumer_stock.service'
import { StockLogDTO } from '@consumer_stock/dto/stock.log.dto'
import { mockInventoryStockLogModel } from '@consumer_stock/mock/stock.log.mock'
import {
  mockInventoryStock,
  mockInventoryStockModel,
} from '@consumer_stock/mock/stock.mock'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import {
  mockMasterStockPoint,
  mockMasterStockPointModel,
} from '@gateway_core/master/mock/master.stock.point.mock'
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
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
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
  let stockPointModel: Model<MasterStockPoint>
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
              withTransaction: jest
                .fn()
                .mockImplementation((callback) => callback()),
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
          useValue: mockMasterStockPointModel,
        },
        {
          provide: getModelToken(InventoryStockLog.name, 'primary'),
          useValue: mockInventoryStockLogModel,
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

    stockPointModel = module.get<Model<MasterStockPointDocument>>(
      getModelToken(MasterStockPoint.name, 'primary')
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
      it(
        testCaption(
          'DATA',
          'data',
          'Should return true if stock point is exist on auditing'
        ),
        async () => {
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce([
            {
              id: 'xx1',
              code: 'xx1',
              name: 'xx1',
            },
            {
              id: 'xx2',
              code: 'xx2',
              name: 'xx2',
            },
          ] satisfies IMasterStockPoint[])

          await consumerStockService.IsAuditing('xx1').then((result) => {
            expect(result).toBe(true)
          })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should throw error if origin stock point and target stock point is undefined'
        ),
        async () => {
          const payload: StockLogDTO = {
            from: null,
            to: null,
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

          expect(
            async () =>
              await consumerStockService.movement(payload, mockAccount())
          ).rejects.toThrow()
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should prepare origin stock model if defined'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          const stockModelFind = jest.spyOn(inventoryStockModel, 'findOne')

          const payload: StockLogDTO = {
            from: mockMasterStockPoint(),
            to: null,
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
              expect(stockModelFind).toHaveBeenCalled()
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should write log as audit if stock point is on audit mode'
        ),
        async () => {
          jest.spyOn(consumerStockService, 'IsAuditing').mockResolvedValue(true)

          // const session = await mongoTransaction.startSession()

          // jest.spyOn(session, 'withTransaction').mockImplementation()

          jest.spyOn(consumerStockService, 'IsAuditing').mockResolvedValue(true)

          const bulkProcess = jest.spyOn(inventoryStockLogModel, 'bulkWrite')

          const payload: StockLogDTO = {
            from: mockMasterStockPoint(),
            to: null,
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
              expect(bulkProcess).toHaveBeenCalled()
              expect(bulkProcess).toHaveBeenCalledTimes(1)
              expect(bulkProcess).toHaveBeenCalledWith(
                expect.arrayContaining([
                  expect.objectContaining({
                    insertOne: expect.objectContaining({
                      document: expect.objectContaining({
                        stock_flow_type: 'audit',
                      }),
                    }),
                  }),
                ]),
                expect.anything()
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should throw exception if stock is not found'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          jest.spyOn(inventoryStockModel, 'findOne').mockResolvedValue(null)

          const payload: StockLogDTO = {
            from: mockMasterStockPoint(),
            to: null,
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

          expect(
            async () =>
              await consumerStockService.movement(payload, mockAccount())
          ).rejects.toThrow(Error)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should throw exception if unsufficient balance'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          jest.spyOn(inventoryStockModel, 'findOne').mockResolvedValue({
            ...mockInventoryStock(),
            qty: 1,
          })

          const payload: StockLogDTO = {
            from: mockMasterStockPoint(),
            to: null,
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

          expect(
            async () =>
              await consumerStockService.movement(payload, mockAccount())
          ).rejects.toThrow(Error)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should prepare target stock model if defined'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          const stockModelFind = jest.spyOn(inventoryStockModel, 'findOne')

          const payload: StockLogDTO = {
            from: null,
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
              expect(stockModelFind).toHaveBeenCalled()
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should upsert stock if target stock is not found'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          const targetAccount = mockAccount()

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          jest.spyOn(inventoryStockModel, 'findOne').mockResolvedValue(null)

          jest.spyOn(inventoryStockModel, 'bulkWrite')

          const payload: StockLogDTO = {
            from: null,
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
            .movement(payload, targetAccount)
            .then(() => {})
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should log stock with balance increment if stock exists (Audit mode off)'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          const targetAccount = mockAccount()
          const foundedStock = mockInventoryStock()

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          jest
            .spyOn(inventoryStockModel, 'findOne')
            .mockResolvedValue(foundedStock)

          const bulkProcess = jest.spyOn(inventoryStockLogModel, 'bulkWrite')

          const payload: StockLogDTO = {
            from: null,
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
            .movement(payload, targetAccount)
            .then(() => {
              expect(bulkProcess).toHaveBeenCalled()
              expect(bulkProcess).toHaveBeenCalledTimes(1)
              expect(bulkProcess).toHaveBeenCalledWith(
                expect.arrayContaining([
                  expect.objectContaining({
                    insertOne: expect.objectContaining({
                      document: expect.objectContaining({
                        balance: foundedStock.qty,
                        stock_flow_type: 'normal',
                      }),
                    }),
                  }),
                ]),
                expect.anything()
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should log stock with balance increment if stock exists (Audit mode on)'
        ),
        async () => {
          jest.spyOn(consumerStockService, 'IsAuditing').mockResolvedValue(true)

          const targetAccount = mockAccount()
          const foundedStock = mockInventoryStock()

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          jest
            .spyOn(inventoryStockModel, 'findOne')
            .mockResolvedValue(foundedStock)

          const bulkProcess = jest.spyOn(inventoryStockLogModel, 'bulkWrite')

          const payload: StockLogDTO = {
            from: null,
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
            .movement(payload, targetAccount)
            .then(() => {
              expect(bulkProcess).toHaveBeenCalled()
              expect(bulkProcess).toHaveBeenCalledTimes(1)
              expect(bulkProcess).toHaveBeenCalledWith(
                expect.arrayContaining([
                  expect.objectContaining({
                    insertOne: expect.objectContaining({
                      document: expect.objectContaining({
                        balance: foundedStock.qty,
                        stock_flow_type: 'audit',
                      }),
                    }),
                  }),
                ]),
                expect.anything()
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should log stock with 0 balance if stock not exists (Audit mode off)'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          const targetAccount = mockAccount()

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          jest.spyOn(inventoryStockModel, 'findOne').mockResolvedValue(null)

          const bulkProcess = jest.spyOn(inventoryStockLogModel, 'bulkWrite')

          const payload: StockLogDTO = {
            from: null,
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
            .movement(payload, targetAccount)
            .then(() => {
              expect(bulkProcess).toHaveBeenCalled()
              expect(bulkProcess).toHaveBeenCalledTimes(1)
              expect(bulkProcess).toHaveBeenCalledWith(
                expect.arrayContaining([
                  expect.objectContaining({
                    insertOne: expect.objectContaining({
                      document: expect.objectContaining({
                        balance: 0,
                        stock_flow_type: 'normal',
                      }),
                    }),
                  }),
                ]),
                expect.anything()
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should log stock with 0 balance if stock not exists (Audit mode on)'
        ),
        async () => {
          jest.spyOn(consumerStockService, 'IsAuditing').mockResolvedValue(true)

          const targetAccount = mockAccount()

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          jest.spyOn(inventoryStockModel, 'findOne').mockResolvedValue(null)

          const bulkProcess = jest.spyOn(inventoryStockLogModel, 'bulkWrite')

          const payload: StockLogDTO = {
            from: null,
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
            .movement(payload, targetAccount)
            .then(() => {
              expect(bulkProcess).toHaveBeenCalled()
              expect(bulkProcess).toHaveBeenCalledTimes(1)
              expect(bulkProcess).toHaveBeenCalledWith(
                expect.arrayContaining([
                  expect.objectContaining({
                    insertOne: expect.objectContaining({
                      document: expect.objectContaining({
                        balance: 0,
                        stock_flow_type: 'audit',
                      }),
                    }),
                  }),
                ]),
                expect.anything()
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should throw error if target stock point is not found'
        ),
        async () => {
          jest
            .spyOn(consumerStockService, 'IsAuditing')
            .mockResolvedValue(false)

          const session = await mongoTransaction.startSession()

          jest.spyOn(session, 'withTransaction').mockImplementation()

          jest.spyOn(stockPointModel, 'findOne').mockResolvedValue(null)

          const payload: StockLogDTO = {
            from: null,
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

          expect(
            async () =>
              await consumerStockService.movement(payload, mockAccount())
          ).rejects.toThrow(Error)
        }
      )

      it(testCaption('DATA', 'data', 'Should catch error'), async () => {
        jest
          .spyOn(mongoTransaction, 'startSession')
          .mockRejectedValue(new Error())

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

        await expect(
          consumerStockService.movement(payload, mockAccount(), '')
        ).rejects.toThrow(Error)
      })
    }
  )

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
