import { IMasterStockPoint } from '@gateway_core/master/interface/master.stock.point'
import { MasterItemService } from '@gateway_core/master/services/master.item.service'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import { StockService } from '@gateway_inventory/stock/stock.service'
import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueError,
  OnQueuePaused,
  Process,
  Processor,
} from '@nestjs/bull'
import { Inject } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterItemBatch,
  MasterItemBatchDocument,
} from '@schemas/master/master.item.batch'
import { Job } from 'bull'
import * as fs from 'fs'
import { Model } from 'mongoose'
import * as readline from 'readline'

@Processor('stock')
export class StockProcessor {
  constructor(
    @Inject(StockService)
    private readonly stockService: StockService,

    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService,

    @Inject(MasterStockPointService)
    private readonly masterStockPointService: MasterStockPointService,

    @InjectModel(MasterItemBatch.name, 'primary')
    private masterItemBatchModel: Model<MasterItemBatchDocument>
  ) {}
  @OnQueueActive()
  onActive(job: Job) {
    job.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`
    )
  }

  @OnQueueError()
  onError(error: Error) {
    throw new Error(error?.stack)
  }

  @OnQueuePaused()
  onPaused() {
    // job.log('Job paused?');
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    job.progress(100)
    job.log(`Job finished with result: ${result}`)
  }

  @Process('import')
  async import(job: Job) {
    const data = job.data
    const initiate = {}
    const fileStream = fs.createReadStream(data.filename)
    const readData = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })
    let a = 0
    let header = []

    for await (const row of readData) {
      const aRow = row.split(',')
      if (a > 0) {
        const singleData = header.reduce(
          (acc, curr) => ((acc[curr] = ''), acc),
          {}
        )

        for (let a = 0; a < aRow.length; a++) {
          singleData[header[a]] = aRow[a]
        }

        const itemDetail = await this.masterItemService
          .find({
            name: singleData.item,
          })
          .then((itemResult) => itemResult.payload)

        if (itemDetail) {
          let batchDetail = await this.masterItemBatchModel
            .findOne({
              code: singleData.batch,
            })
            .exec()

          if (!batchDetail) {
            await this.masterItemBatchModel
              .create({
                code: singleData.batch,
                item: {
                  id: itemDetail['id'],
                  code: itemDetail['code'],
                  name: itemDetail['name'],
                  brand: itemDetail['brand'] ?? {
                    id: '',
                    code: '',
                    name: '',
                  },
                },
                expired: new Date(singleData.expired_date),
                created_by: data.account,
              })
              .then(async () => {
                batchDetail = await this.masterItemBatchModel
                  .findOne({
                    code: singleData.batch,
                  })
                  .exec()
              })
          }

          let stockPointDetail = await this.masterStockPointService
            .find({
              name: singleData.stock_point,
            })
            .then((stockPointResult) => stockPointResult.payload)

          if (!stockPointDetail) {
            await this.masterStockPointService
              .add(
                {
                  code: `AUTO-${new Date().getTime()}`,
                  name: singleData.stock_point,
                  configuration: {
                    allow_grn: false,
                    allow_incoming: false,
                    allow_outgoing: false,
                    allow_destruction: false,
                  },
                  remark: 'Auto generated stock point from stock import',
                },
                data.account
              )
              .then(async () => {
                stockPointDetail = await this.masterStockPointService
                  .find({
                    name: singleData.stock_point,
                  })
                  .then((stockPointResult) => stockPointResult.payload)
              })
          }

          if (!initiate[stockPointDetail['id']]) {
            initiate[stockPointDetail['id']] = []
          }

          initiate[stockPointDetail['id']].push({
            stock_point: {
              id: stockPointDetail['id'],
              code: stockPointDetail['code'],
              name: stockPointDetail['name'],
            },
            item: {
              id: itemDetail['id'],
              code: itemDetail['code'],
              name: itemDetail['name'],
              brand: itemDetail['brand'] ?? {
                id: '',
                code: '',
                name: '',
              },
            },
            batch: {
              id: batchDetail.id,
              code: batchDetail.code,
              expired: batchDetail.expired.toString(),
            },
            qty: parseFloat(singleData.qty),
            remark: singleData.remark,
          })
        }
      } else {
        header = aRow
      }
      a++
    }

    for (const key in initiate) {
      let stock_point: IMasterStockPoint
      const item = []
      for (const bItem in initiate[key]) {
        stock_point = initiate[key][bItem].stock_point
        item.push({
          item: initiate[key][bItem].item,
          batch: initiate[key][bItem].batch,
          qty: initiate[key][bItem].qty,
          remark: initiate[key][bItem].remark,
        })
      }

      await this.stockService.stockInitiate(
        {
          stock_point: stock_point,
          item: item,
        },
        data.account,
        data.token
      )
    }
  }
}
