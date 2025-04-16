import { ConsumerStockController } from '@consumer_stock/consumer_stock.controller'
import { ConsumerStockService } from '@consumer_stock/consumer_stock.service'
import { AccountService } from '@gateway_core/account/account.service'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity } from '@log/schemas/log.activity'
import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientKafka, Transport } from '@nestjs/microservices'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { InventoryStock } from '@schemas/inventory/stock'
import { InventoryStockLog } from '@schemas/inventory/stock.log'
import { AuthService } from '@security/auth.service'
import { KAFKA_TOPICS } from '@utility/constants'
import { DecoratorProcessorService } from '@utility/decorator'
import { SubscribeTo } from '@utility/kafka/avro/decorator'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'

describe('Consumer Stock', () => {
  let app: INestApplication
  let consumerStockController: ConsumerStockController
  let consumerStockService: ConsumerStockService
  let client: ClientKafka
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConsumerStockController],
      providers: [
        SocketIoClientProvider,
        SocketIoClientProxyService,
        DecoratorProcessorService,
        {
          provide: ConsumerStockService,
          useValue: {
            movement: () => jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn(() => Promise.resolve('Asia/Jakarta')),
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
            emit: () => jest.fn(),
            subscribeToResponseOf: () => jest.fn(),
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
          provide: getModelToken(InventoryStock.name, 'primary'),
          useValue: {},
        },
        {
          provide: getModelToken(InventoryStockLog.name, 'primary'),
          useValue: {},
        },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: getModelToken(Account.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()

    await app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        port: 4000,
      },
    })

    app.get(DecoratorProcessorService).processDecorators([
      {
        target: ConsumerStockController,
        constant: KAFKA_TOPICS,
        meta: `kafka.stock.topic`,
        decorator: SubscribeTo,
      },
    ])

    await app.startAllMicroservices()
    await app.init()
    client = moduleFixture.get<ClientKafka>('STOCK_SERVICE')
    app.init()

    consumerStockController = app.get<ConsumerStockController>(
      ConsumerStockController
    )

    consumerStockService = app.get<ConsumerStockService>(ConsumerStockService)
  })

  it('Message consumed and passed to service', async () => {
    // const consumerSpy = jest.spyOn(consumerStockController, 'stock')
    await client.emit('HORAS_stock', {
      headers: {},
      key: {
        id: '',
        code: '',
        service: 'stock',
        method: 'stock_movement',
      },
      value: {},
    })
    // expect(consumerSpy).toHaveBeenCalled()

    const consumerStockServiceSpy = jest.spyOn(consumerStockService, 'movement')
    await consumerStockController.stock(
      {},
      {
        id: '',
        code: '',
        service: '',
        method: 'stock_movement',
      },
      '0',
      '',
      0,
      '',
      null,
      {
        id: '',
        email: '',
        first_name: '',
        last_name: '',
      }
    )
    expect(consumerStockServiceSpy).toHaveBeenCalled()
    expect(consumerStockServiceSpy).toHaveBeenCalledTimes(1)
  })

  it('Unhandled method should return error', async () => {
    const consumerStockServiceSpy = jest.spyOn(consumerStockService, 'movement')
    await consumerStockController.stock(
      {},
      {
        id: '',
        code: '',
        service: '',
        method: 'random',
      },
      '0',
      '',
      0,
      '',
      null,
      {
        id: '',
        email: '',
        first_name: '',
        last_name: '',
      }
    )
    expect(consumerStockServiceSpy).not.toHaveBeenCalled()
    expect(consumerStockServiceSpy).toHaveBeenCalledTimes(0)
  })

  afterEach(async () => {
    jest.fn().mockClear()
    await app.close()
  })

  afterAll(async () => {
    jest.fn().mockClear()
    await app.close()
  })
})
