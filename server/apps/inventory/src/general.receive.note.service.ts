import { Account } from '@core/account/schemas/account.model'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
import { GeneralReceiveNoteAddDTO } from '@inventory/dto/general.receive.note'
import { InventoryService } from '@inventory/inventory.service'
import { PurchaseOrderService } from '@inventory/purchase.order.service'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@inventory/schemas/general.receive.note'
import { IGeneralReceiveNoteDetail } from '@inventory/schemas/general.receive.note.detail'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { pad } from '@utility/string'
import { Model } from 'mongoose'

@Injectable()
export class GeneralReceiveNoteService {
  constructor(
    @InjectModel(GeneralReceiveNote.name)
    private generalReceiveNoteModel: Model<GeneralReceiveNoteDocument>,

    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService,

    @Inject(MasterStockPointService)
    private readonly masterStockPointService: MasterStockPointService,

    @Inject(InventoryService)
    private readonly inventoryService: InventoryService
  ) {}
  async add(
    generatedID: string,
    data: GeneralReceiveNoteAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    /*
     * #1. Prepare for the data
     *     a. PO have been approved
     *     b. Items are listed on PO
     *     c. Stock point is allowed to receive grn
     * #2. Save the data
     * */

    const detailData: IGeneralReceiveNoteDetail[] = []

    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    // #1
    const updateStock = []
    await this.purchaseOrderService
      .detail(data.purchase_order.id)
      .then(async (purchaseOrder) => {
        // a
        if (purchaseOrder && purchaseOrder.status === 'approved') {
          await this.masterStockPointService
            .detail(data.stock_point.id)
            .then(async (stock_point) => {
              if (stock_point && stock_point.configuration.allow_grn === true) {
                if (!data.code) {
                  const now = new Date()
                  await this.generalReceiveNoteModel
                    .count({
                      created_at: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                        $lte: new Date(
                          now.getFullYear(),
                          now.getMonth() + 1,
                          0
                        ),
                      },
                    })
                    .then((counter) => {
                      data.code = `${
                        modCodes[this.constructor.name]
                      }-${new Date()
                        .toJSON()
                        .slice(0, 7)
                        .replace(/-/g, '/')}/${pad(
                        '000000',
                        counter + 1,
                        true
                      )}`
                    })
                }

                await Promise.all(
                  data.detail.map(async (row) => {
                    // Check if the items input are exist in purchase order document
                    const foundItem = purchaseOrder.detail.find(
                      (itemDetail) => {
                        return itemDetail.item.id === row.item.id
                      }
                    )

                    if (foundItem) {
                      let delivered = foundItem.delivered || 0
                      delivered += row.qty

                      updateStock.push({
                        po: data.purchase_order.id,
                        item: foundItem.item,
                        delivered: delivered,
                        qty: row.qty,
                        label: row.storing_label,
                        batch: {
                          code: row.batch,
                          expired: row.expired_date,
                        },
                      })

                      foundItem.delivered = delivered
                      const detail: IGeneralReceiveNoteDetail =
                        new IGeneralReceiveNoteDetail({
                          ...row,
                          pending: foundItem.qty - foundItem.delivered,
                        })

                      detailData.push(detail)
                    }
                  })
                ).then(async () => {
                  data.detail = detailData

                  // #2
                  await this.generalReceiveNoteModel
                    .create({
                      id: `general_receive_note-${generatedID}`,
                      ...data,
                      created_by: account,
                    })
                    .then(async (result) => {
                      // Update purchase order status
                      await Promise.all(
                        updateStock.map(async (e) => {
                          await this.purchaseOrderService
                            .update_receive(e.po, e.item, e.delivered)
                            .then(async () => {
                              await this.inventoryService
                                .stockMove({
                                  item: e.item,
                                  batch:
                                    await this.inventoryService.batchCreator(
                                      e.item,
                                      e.batch.code,
                                      e.batch.expired,
                                      account
                                    ),
                                  stock_point: stock_point,
                                  qty: e.qty,
                                  type: 'in',
                                  transaction: 'general_receive_note',
                                  transaction_id: result.id,
                                })
                                .then(async () => {
                                  // Update master item information for storing label
                                  await this.inventoryService
                                    .storingLabel(e.label, e.item, stock_point)
                                    .catch((error: Error) => {
                                      response.payload = {
                                        message: `General receive note failed to create. Fail to update storing label ${error.message}`,
                                      }
                                    })
                                })
                                .catch((error: Error) => {
                                  response.payload = {
                                    message: `General receive note failed to create. Fail to increase stock ${error.message}`,
                                  }
                                })
                            })
                            .catch((error: Error) => {
                              response.payload = {
                                message: `General receive note failed to create. Fail update purchase order ${error.message}`,
                              }
                            })
                        })
                      ).then(() => {
                        response.message =
                          'General receive note created successfully'
                        response.transaction_id = result._id
                        // response.payload = result
                      })
                    })
                    .catch((error: Error) => {
                      response.message = `General receive note failed to create. ${error.message}`
                      response.statusCode =
                        modCodes[this.constructor.name].error.databaseError
                      response.payload = error
                    })
                })
              } else {
                response.message = `General receive note failed to create. Stock point is unrecognized`
                response.statusCode =
                  modCodes[this.constructor.name].error.databaseError
              }
            })
        } else {
          response.message = `General receive note failed to create. Purchase order is not valid`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
        }
      })
      .catch((error: Error) => {
        response.message = `General receive note failed to create. Purchase order error : ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
      })

    return response
  }
}
