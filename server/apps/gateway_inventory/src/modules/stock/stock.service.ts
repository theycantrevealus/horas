import { AccountService } from '@gateway_core/account/account.service'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { IMasterStockPoint } from '@gateway_core/master/interface/master.stock.point'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import {
  StockAssignDTO,
  StockInitiateDTO,
  StockTransferDTO,
} from '@gateway_inventory/stock/dto/stock'
import { InjectQueue } from '@nestjs/bullmq'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  InventoryStock,
  InventoryStockDocument,
} from '@schemas/inventory/stock'
import { GlobalResponse } from '@utility/dto/response'
import { KafkaService } from '@utility/kafka/avro/service'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { Queue } from 'bullmq'
import { CompressionTypes } from 'kafkajs'
import { Model, Types } from 'mongoose'

@Injectable()
export class StockService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService,

    @Inject(AccountService)
    private readonly accountService: AccountService,

    @Inject(MasterStockPointService)
    private readonly masterStockPointService: MasterStockPointService,

    @InjectModel(InventoryStock.name, 'primary')
    private inventoryStockModel: Model<InventoryStockDocument>,

    @InjectQueue('stock') private readonly stockImportQueue: Queue
  ) {}

  async stockTransfer(
    payload: StockTransferDTO,
    account: IAccountCreatedBy,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'STOCK_TRANSFER',
      transaction_id: '',
    } satisfies GlobalResponse

    const generatedID = new Types.ObjectId().toString()
    const transaction = await this.clientStock.transaction('stck_trf')

    try {
      const items = []
      payload.item.forEach((item) => {
        items.push({
          headers: {
            ...account,
            token: token,
          },
          key: {
            id: `stock_transfer-${generatedID.toString()}`,
            code: generatedID.toString(),
            service: 'stock',
            method: 'stock_movement',
          },
          value: {
            item: item.item,
            batch: item.batch,
            from: payload.from,
            to: payload.to,
            qty: item.qty,
            balance: item.qty,
            transaction_id: `stock_transfer-${generatedID.toString()}`,
            logged_at: new Date().toString(),
          },
        })
      })

      await transaction.send({
        acks: -1,
        timeout: 5000,
        compression: CompressionTypes.None,
        topic: this.configService.get<string>('kafka.stock.topic.stock'),
        messages: items,
      })

      await transaction.commit().then(() => {
        response.message = 'Stock transfer requested successfully'
        response.transaction_id = `stock_transfer-${generatedID}`
      })
    } catch (kafkaError) {
      await transaction.abort()
      response.message = `Stock transfer failed to create. ${kafkaError}`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }

    return response
  }

  async stockBalance(parameter: any) {
    return await prime_datatable(parameter, this.inventoryStockModel)
  }

  async stockImport(
    filename: string,
    payload,
    account: IAccountCreatedBy,
    token
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'STOCK_TRANSFER',
      transaction_id: '',
    } satisfies GlobalResponse
    return await this.stockImportQueue
      .add('import', {
        filename: filename,
        payload: payload,
        account: account,
        token: token,
      })
      .then((result) => {
        response.payload = result
        return response
      })
      .catch((error) => {
        response.message = error.message
        throw new Error(JSON.stringify(response))
      })
  }

  async stockInitiate(
    payload: StockInitiateDTO,
    account: IAccountCreatedBy,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'STOCK_INITIATE',
      transaction_id: '',
    } satisfies GlobalResponse

    const generatedID = new Types.ObjectId().toString()
    const transaction = await this.clientStock.transaction('stck_init')
    try {
      const items = []
      payload.item.forEach((item) => {
        items.push({
          headers: {
            ...account,
            token: token,
          },
          key: {
            id: `stock_init-${generatedID.toString()}`,
            code: generatedID.toString(),
            service: 'stock',
            method: 'stock_movement',
          },
          value: {
            item: item.item,
            batch: item.batch,
            from: {
              id: '-',
              code: '-',
              name: '-',
            },
            to: payload.stock_point,
            qty: item.qty,
            balance: item.qty,
            transaction_id: `stock_init-${generatedID.toString()}`,
            logged_at: new Date().toString(),
          },
        })
      })

      await transaction.send({
        acks: -1,
        timeout: 5000,
        compression: CompressionTypes.None,
        topic: this.configService.get<string>('kafka.stock.topic.stock'),
        messages: items,
      })

      await transaction.commit().then(() => {
        response.message = 'Stock init requested successfully'
        response.transaction_id = `stock_transfer-${generatedID}`
      })
    } catch (kafkaError) {
      await transaction.abort()
      response.message = `Stock init failed to create. ${kafkaError}`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }

    return response
  }

  async assignStockPoint(
    payload: StockAssignDTO,
    account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'STOCK_ASSIGN',
      transaction_id: '',
    } satisfies GlobalResponse

    const stockPointToAdd: IMasterStockPoint[] = []

    for await (const a of payload.stock_point) {
      const checkStockPoint = await this.masterStockPointService.detail(a)
      if (checkStockPoint) {
        stockPointToAdd.push(checkStockPoint.payload as IMasterStockPoint)
      }
    }

    try {
      return await this.accountService
        .accountFind({
          id: payload.account,
        })
        .then(async (accountDetail) => {
          if (accountDetail) {
            return await this.accountService
              .accountEdit(
                {
                  stock_point: stockPointToAdd,
                  __v: accountDetail.payload['__v'],
                },
                payload.account
              )
              .then(async (result) => {
                response.message = 'Stock point assigned successfully'
                response.payload = {
                  id: result.payload['id'],
                  code: result.payload['code'],
                  email: result.payload['email'],
                  stock_point: result.payload['stock_point'],
                  account: account,
                }
                return response
              })
              .catch((accountUpdateError: GlobalResponse) => {
                response.message = accountUpdateError.message
                throw new Error(JSON.stringify(response))
              })
          } else {
            response.message = 'Account not found'
            throw new Error(JSON.stringify(response))
          }
        })
        .catch((accountFindError: GlobalResponse) => {
          response.message = accountFindError.message
          throw new Error(JSON.stringify(response))
        })
    } catch (error) {
      response.message = `Stock point failed to assign. ${error.message}`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
