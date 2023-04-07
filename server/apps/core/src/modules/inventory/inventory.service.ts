import { Account } from '@core/account/schemas/account.model'
import { StockDTO } from '@core/inventory/dto/stock'
import {
  InventoryStock,
  InventoryStockDocument,
} from '@core/inventory/schemas/stock'
import {
  InventoryStockLog,
  InventoryStockLogDocument,
} from '@core/inventory/schemas/stock.log'
import {
  MasterItemBatch,
  MasterItemBatchDocument,
} from '@core/master/schemas/master.item.batch'
import { IMasterItemBatch } from '@core/master/schemas/master.item.batch.join'
import { IMasterItem } from '@core/master/schemas/master.item.join'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(MasterItemBatch.name)
    private masterItemBatchModel: Model<MasterItemBatchDocument>,

    @InjectModel(InventoryStock.name)
    private inventoryStockModel: Model<InventoryStockDocument>,

    @InjectModel(InventoryStockLog.name)
    private inventoryStockLogModel: Model<InventoryStockLogDocument>
  ) {}
  async batchCreator(
    item: IMasterItem,
    code: string,
    expired: Date,
    account: Account
  ): Promise<IMasterItemBatch> {
    return await this.masterItemBatchModel
      .findOne({
        item: item,
        code: code,
      })
      .exec()
      .then(async (result) => {
        if (result) {
          return result
        } else {
          const newBatch = new this.masterItemBatchModel({
            code: code,
            item: item,
            expired: expired,
            created_by: account,
          })
          return await newBatch.save().then((batchData) => {
            return batchData
          })
        }
      })
  }

  async stock_move(data: StockDTO) {
    await this.inventoryStockModel
      .findOne({
        'item.id': data.item.id,
        'batch.id': data.batch.id,
        'stock_point.id': data.stock_point.id,
      })
      .exec()
      .then(async (result) => {
        let proceed,
          balance = 0
        if (result) {
          balance = result.qty
          proceed = await this.inventoryStockModel
            .updateOne(
              {
                'item.id': data.item.id,
                'batch.id': data.batch.id,
                'stock_point.id': data.stock_point.id,
              },
              {
                $inc: {
                  qty: data.qty,
                },
              }
            )
            .exec()
        } else {
          proceed = new this.inventoryStockModel({
            item: data.item,
            batch: data.batch,
            stock_point: data.stock_point,
            qty: data.qty,
          })

          await proceed.save()
        }

        if (proceed) {
          const log = new this.inventoryStockLogModel({
            item: data.item,
            batch: data.batch,
            stock_point: data.stock_point,
            in: data.type === 'in' ? data.qty : 0,
            out: data.type === 'out' ? data.qty : 0,
            balance: balance + data.qty,
            transaction: data.transaction,
            transaction_id: data.transaction_id,
          })

          await log.save()
        }
      })
  }
}
