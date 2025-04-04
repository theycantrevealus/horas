import { StockDTO } from '@inventory/dto/stock'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import {
  InventoryStock,
  InventoryStockDocument,
} from '@schemas/inventory/stock'
import {
  InventoryStockLog,
  InventoryStockLogDocument,
} from '@schemas/inventory/stock.log'
import { MasterItem, MasterItemDocument } from '@schemas/master/master.item'
import {
  MasterItemBatch,
  MasterItemBatchDocument,
} from '@schemas/master/master.item.batch'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { IMasterItemStoring } from '@schemas/master/master.item.storing.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Model } from 'mongoose'

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(MasterItem.name)
    private masterItemModel: Model<MasterItemDocument>,

    @InjectModel(MasterItemBatch.name)
    private masterItemBatchModel: Model<MasterItemBatchDocument>,

    @InjectModel(InventoryStock.name)
    private inventoryStockModel: Model<InventoryStockDocument>,

    @InjectModel(InventoryStockLog.name)
    private inventoryStockLogModel: Model<InventoryStockLogDocument>
  ) {}

  async stokMovement(data: StockDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: data,
      transaction_classify: 'PURCHASE_ORDER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    return response
  }

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

  // async stockMove(data: StockDTO) {
  //   await this.inventoryStockModel
  //     .findOne({
  //       'item.id': data.item.id,
  //       'batch.id': data.batch.id,
  //       'stock_point.id': data.stock_point.id,
  //     })
  //     .exec()
  //     .then(async (result) => {
  //       let proceed,
  //         balance = 0
  //       if (result) {
  //         balance = result.qty
  //         proceed = await this.inventoryStockModel
  //           .updateOne(
  //             {
  //               'item.id': data.item.id,
  //               'batch.id': data.batch.id,
  //               'stock_point.id': data.stock_point.id,
  //             },
  //             {
  //               $inc: {
  //                 qty: data.qty,
  //               },
  //             }
  //           )
  //           .exec()
  //       } else {
  //         proceed = new this.inventoryStockModel({
  //           item: data.item,
  //           batch: data.batch,
  //           stock_point: data.stock_point,
  //           qty: data.qty,
  //         })
  //
  //         await proceed.save()
  //       }
  //
  //       if (proceed) {
  //         const log = new this.inventoryStockLogModel({
  //           item: data.item,
  //           batch: data.batch,
  //           stock_point: data.stock_point,
  //           in: data.type === 'in' ? data.qty : 0,
  //           out: data.type === 'out' ? data.qty : 0,
  //           balance: balance + data.qty,
  //           transaction: data.transaction,
  //           transaction_id: data.transaction_id,
  //         })
  //
  //         await log.save()
  //       }
  //     })
  // }

  async storingLabel(
    label: string,
    item: IMasterItem,
    stock_point: IMasterStockPoint
  ) {
    await this.masterItemModel
      .findOne({
        id: item.id,
        'storing.stock_point.id': stock_point.id,
      })
      .exec()
      .then(async (result) => {
        const storingSet: IMasterItemStoring = {
          stock_point: stock_point,
          storing_label: label,
          minimum: 0,
          maximum: 0,
        }
        if (result) {
          await this.masterItemModel
            .updateOne(
              {
                id: item.id,
                'storing.stock_point.id': stock_point.id,
              },
              {
                $set: {
                  'storing.$.storing_label': label,
                },
              }
            )
            .exec()
            .catch((e: Error) => {
              console.log(e.message)
            })
        } else {
          await this.masterItemModel
            .updateOne(
              {
                id: item.id,
              },
              {
                $push: {
                  storing: storingSet,
                },
              }
            )
            .exec()
            .catch((e: Error) => {
              console.log(e.message)
            })
        }
      })
      .catch((e: Error) => {
        console.log(e.message)
      })
  }
}
