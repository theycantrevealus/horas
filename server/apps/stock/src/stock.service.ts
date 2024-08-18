import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
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
import { Model } from 'mongoose'

@Injectable()
export class StockService {
  constructor(
    @InjectModel(InventoryStock.name, 'primary')
    private inventoryStockModel: Model<InventoryStockDocument>,

    @InjectModel(InventoryStockLog.name, 'primary')
    private inventoryStockModelLog: Model<InventoryStockLogDocument>
  ) {}

  async stock_movement(
    payload: StockLogDTO,
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
      transaction_classify: 'STOCK_MOVEMENT',
      transaction_id: null,
    } satisfies GlobalResponse
    const stockPointUpdate = []
    if (payload.from.id !== '-' && payload.from.id !== '') {
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
              storing_label: '',
            },
            $dec: {
              qty: payload.out,
            },
          },
        },
      })
    }

    if (payload.to.id !== '-' && payload.to.id !== '') {
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
              storing_label: '',
            },
            $inc: {
              qty: payload.in,
            },
          },
        },
      })
    }

    return await this.inventoryStockModel
      .bulkWrite(stockPointUpdate)
      .then(async () => {
        return await this.inventoryStockModelLog
          .create({
            item: payload.item,
            batch: payload.batch,
            from: payload.from,
            to: payload.to,
            in: payload.in,
            out: payload.out,
            balance_from: payload.balance_from,
            balance_to: payload.balance_to,
            transaction_id: payload.transaction_id,
            created_by: account,
          })
          .then((result) => {
            response.message = 'Stock updated'
            response.transaction_id = result._id
            response.payload = {
              id: result.id,
              ...payload,
            }
            return response
          })
      })
      .catch((error) => {
        console.error(error)
        response.message = `Stock failed to process`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async recalculate_stock() {}
}
