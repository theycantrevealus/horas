import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import {
  InventoryStock,
  InventoryStockDocument,
} from '@schemas/inventory/stock'
import {
  InventoryStockLog,
  InventoryStockLogDocument,
} from '@schemas/inventory/stock.log'
import { StockLogDTO } from '@stock/dto/stock.log'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Connection, Model } from 'mongoose'

@Injectable()
export class StockService {
  constructor(
    @InjectConnection('primary') private mongoConnection: Connection,

    @InjectModel(InventoryStock.name, 'primary')
    private inventoryStockModel: Model<InventoryStockDocument>,

    @InjectModel(InventoryStockLog.name, 'primary')
    private inventoryStockModelLog: Model<InventoryStockLogDocument>
  ) {}

  async stock_movement(
    payload: StockLogDTO,
    account: IAccount
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'STOCK_MOVEMENT',
      transaction_id: null,
    } satisfies GlobalResponse
    const stockPointUpdate = []
    const stockPointLog = []
    const session = await this.mongoConnection.startSession()
    await session
      .withTransaction(async () => {
        let fromData = 0
        let toData = 0
        let fromFlag = false
        if (payload.from.id !== '-' && payload.from.id !== '') {
          await this.inventoryStockModel
            .findOne({ stock_point: payload.from })
            .session(session)
            .then((stockFromData) => {
              fromData = stockFromData?.qty ?? 0
              if (stockFromData && stockFromData.qty >= payload.qty) {
                stockPointUpdate.push({
                  updateOne: {
                    filter: {
                      'stock_point.id': payload.from.id,
                    },
                    upsert: true,
                    update: {
                      $set: {
                        stock_point: payload.from,
                        item: payload.item,
                        batch: payload.batch,
                      },
                      $inc: {
                        qty: payload.qty * -1,
                      },
                    },
                  },
                })
              } else {
                response.message = `Origin stock is not sufficient`
                response.statusCode = {
                  ...modCodes[this.constructor.name].error.databaseError,
                  classCode: modCodes[this.constructor.name].defaultCode,
                }
                // response.payload = stockFromData
                throw new Error(JSON.stringify(response))
              }
            })
          fromFlag = true
        }

        if (payload.to.id !== '-' && payload.to.id !== '') {
          await this.inventoryStockModel
            .findOne({ stock_point: payload.to })
            .session(session)
            .then((stockToData) => {
              toData = stockToData?.qty ?? 0
              stockPointUpdate.push({
                updateOne: {
                  filter: {
                    'stock_point.id': payload.to.id,
                  },
                  upsert: true,
                  update: {
                    $set: {
                      stock_point: payload.to,
                      item: payload.item,
                      batch: payload.batch,
                    },
                    $inc: {
                      qty: payload.qty,
                    },
                  },
                },
              })
            })
        }

        if (fromFlag) {
          stockPointLog.push({
            insertOne: {
              document: {
                item: payload.item,
                batch: payload.batch,
                stock_point: payload.from,
                in: 0,
                out: payload.qty,
                balance: fromData,
                transaction_id: payload.transaction_id,
                created_by: account,
              },
            },
          })
        }

        stockPointLog.push({
          insertOne: {
            document: {
              item: payload.item,
              batch: payload.batch,
              stock_point: payload.to,
              in: payload.qty,
              out: 0,
              balance: toData,
              transaction_id: payload.transaction_id,
              created_by: account,
            },
          },
        })

        await this.inventoryStockModel
          .bulkWrite(stockPointUpdate)
          .then(async () => {
            return await this.inventoryStockModelLog
              .bulkWrite(stockPointLog)
              .then((result) => {
                response.message = 'Stock updated'
                response.transaction_id = payload.transaction_id
                response.payload = {
                  id: payload.transaction_id,
                  ...result,
                }
                return response
              })
          })
          .catch((error) => {
            response.message = `Stock failed to process`
            response.statusCode = {
              ...modCodes[this.constructor.name].error.databaseError,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.payload = error
            throw new Error(JSON.stringify(response))
          })
      })
      .catch((transactionError) => {
        response.message = `Stock failed to process`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = transactionError
        throw new Error(JSON.stringify(response))
      })

    await session.endSession()

    return response
  }
}
