import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@schemas/inventory/general.receive.note'
import { MasterItem, MasterItemDocument } from '@schemas/master/master.item'
import {
  MasterItemBatch,
  MasterItemBatchDocument,
} from '@schemas/master/master.item.batch'
import { PrimeParameter } from '@utility/dto/prime'
import { KafkaService } from '@utility/kafka/avro/service'
import prime_datatable from '@utility/prime'
import { CompressionTypes } from 'kafkajs'
import { Model } from 'mongoose'

import { GatewayInventoryPurchaseOrderService } from '../purchase_order/purchase.order.service'
import { GeneralReceiveNoteAddDTO } from './dto/general.receive.note.dto'

@Injectable()
export class GatewayInventoryGeneralReceiveNoteService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(MasterItem.name, 'primary')
    private masterItemModel: Model<MasterItemDocument>,

    @InjectModel(MasterItemBatch.name, 'primary')
    private masterItemBacthModel: Model<MasterItemBatchDocument>,

    @InjectModel(GeneralReceiveNote.name, 'primary')
    private generalReceiveNoteModel: Model<GeneralReceiveNoteDocument>,

    @Inject(GatewayInventoryPurchaseOrderService)
    private readonly purchaseOrderService: GatewayInventoryPurchaseOrderService,

    @Inject(MasterStockPointService)
    private readonly masterStockPointService: MasterStockPointService,

    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService
  ) {}

  /**
   * @description List of general receive note
   * @param { any } payload should JSON format string. Try to send wrong format lol
   * @returns
   */
  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.generalReceiveNoteModel)
    } catch (error) {
      throw error
    }
  }

  /**
   * @description General Receive detail
   * @param { string } id what id to get
   * @returns
   */
  async detail(id: string) {
    return this.generalReceiveNoteModel
      .findOne({ id: id })
      .then((result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  /**
   * @description General Receive new data
   * @param { GeneralReceiveNoteAddDTO } data minimum data to add
   * @param { IAccount } account creator
   * @param { string } token account token
   * @returns
   */
  async add(data: GeneralReceiveNoteAddDTO, account: IAccount, token: string) {
    const stockPointConfig = await this.masterStockPointService.find({
      id: data.stock_point.id,
    })

    if (stockPointConfig && stockPointConfig['configuration'].allow_grn) {
      return await this.purchaseOrderService
        .detail(data.purchase_order.id)
        .then(async (purchaseOrder) => {
          if (purchaseOrder && purchaseOrder.status === 'approved') {
            const poDetail = purchaseOrder.detail

            const detailItem = []
            const itemStock = []

            data.detail.forEach(async (item) => {
              await this.masterItemModel
                .findOne({ id: item.item.id })
                .exec()
                .then(async (foundedItem) => {
                  if (foundedItem) {
                    const POItem = poDetail.find(
                      (d) => d.item.id === foundedItem.id
                    )

                    const buyPrice = POItem ? POItem.total : 0
                    let sellPrice = 0

                    if (foundedItem.configuration.benefit_margin_type === 'v') {
                      sellPrice =
                        buyPrice +
                        foundedItem.configuration.benefit_margin_value
                    } else if (
                      foundedItem.configuration.benefit_margin_type === 'p'
                    ) {
                      sellPrice =
                        buyPrice +
                        (buyPrice *
                          foundedItem.configuration.benefit_margin_value) /
                          100
                    } else {
                      sellPrice = buyPrice
                    }

                    // TODO : Handle brand here

                    await this.masterItemBacthModel
                      .findOneAndUpdate(
                        {
                          code: item.batch,
                        },
                        {
                          $set: {
                            code: item.batch,
                            item: item.item,
                            price_buy: buyPrice,
                            price_sell: sellPrice,
                            expired: item.expired,
                          },
                        },
                        { upsert: true, new: true }
                      )
                      .then(async (foundedItemBatch) => {
                        detailItem.push({
                          qty: item.qty,
                          batch: foundedItemBatch,
                          expired: item.expired,
                          remark: item.remark,
                        })

                        itemStock.push({
                          headers: {
                            ...account,
                            token: token,
                          },
                          key: {
                            id: '',
                            code: '',
                            service: 'stock',
                            method: 'stock_movement',
                          },
                          value: {
                            batch: foundedItemBatch,
                            from: {
                              id: '-',
                              code: '-',
                              name: '-',
                            },
                            to: data.stock_point,
                            qty: item.qty,
                            balance: 0,
                            transaction_id: '',
                            logged_at: new Date().toString(),
                          },
                        })
                      })
                  }
                })
            })

            const transaction = await this.clientStock.transaction('grn')

            await this.generalReceiveNoteModel
              .create({
                code: data.code,
                stock_point: data.stock_point,
                purchase_order: purchaseOrder,
                detail: detailItem,
                extras: data.extras,
                remark: data.remark,
                created_by: account,
              })
              .then(async (createdGRN) => {
                await this.purchaseOrderService.updateDeliveredItem(
                  data.purchase_order.id,
                  detailItem.map((d) => ({
                    item: d.batch.item.id,
                    qty: d.qty,
                  }))
                )

                itemStock.forEach((item) => {
                  item.key.id = createdGRN.id
                  item.key.code = createdGRN.code

                  item.value.transaction_id = createdGRN.id
                })

                await transaction.send({
                  acks: -1,
                  timeout: 5000,
                  compression: CompressionTypes.None,
                  topic: this.configService.get<string>(
                    'kafka.stock.topic.stock'
                  ),
                  messages: itemStock,
                })

                await transaction.commit()
                return createdGRN
              })
              .catch(async (error: Error) => {
                await transaction.abort()
                throw error
              })
          } else {
            throw new ForbiddenException(
              'General receive note failed to create. Purchase order is not valid'
            )
          }
        })
        .catch((error: Error) => {
          throw error
        })
    } else {
      throw new ForbiddenException('Stock point is not allowed to GRN')
    }
  }
}
