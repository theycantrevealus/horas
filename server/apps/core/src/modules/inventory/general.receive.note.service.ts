import { Account } from '@core/account/schemas/account.model'
import { GeneralReceiveNoteAddDTO } from '@core/inventory/dto/general.receive.note'
import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@core/inventory/schemas/general.receive.note'
import { IGeneralReceiveNoteDetail } from '@core/inventory/schemas/general.receive.note.detail'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { pad } from '@utility/string'
import { Model } from 'mongoose'

@Injectable()
export class GeneralReceiveNoteService {
  constructor(
    @InjectModel(GeneralReceiveNote.name)
    private generalReceiveNoteModel: Model<GeneralReceiveNoteDocument>,

    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.generalReceiveNoteModel)
  }

  async detail(id: string): Promise<GeneralReceiveNote> {
    return this.generalReceiveNoteModel.findOne({ id: id }).exec()
  }

  async add(
    data: GeneralReceiveNoteAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    /*
     * #1. Prepare for the data
     *     a. PO must approved
     *     b. Item must be listed on PO
     * #2. Save the data
     * */

    const detailData: IGeneralReceiveNoteDetail[] = []

    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    // #1
    await this.purchaseOrderService
      .detail(data.purchase_order.id)
      .then(async (purchaseOrder) => {
        // a
        if (purchaseOrder && purchaseOrder.status === 'approved') {
          if (!data.code) {
            const now = new Date()
            await this.generalReceiveNoteModel
              .count({
                created_at: {
                  $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                  $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
                },
              })
              .then((counter) => {
                data.code = `${modCodes[this.constructor.name]}-${new Date()
                  .toJSON()
                  .slice(0, 7)
                  .replace(/-/g, '/')}/${pad('000000', counter + 1, true)}`
              })
          }

          await Promise.all(
            data.detail.map(async (row) => {
              // Check if the items input are exist in purchase order document
              const foundItem = purchaseOrder.detail.find((itemDetail) => {
                return itemDetail.item.id === row.item.id
              })

              // b
              if (foundItem) {
                let delivered = foundItem.delivered || 0
                delivered += row.qty
                await this.purchaseOrderService.update_receive(
                  data.purchase_order.id,
                  foundItem.item,
                  delivered
                )

                foundItem.delivered = delivered
                const detail: IGeneralReceiveNoteDetail =
                  new IGeneralReceiveNoteDetail({
                    ...row,
                    pending: foundItem.qty - foundItem.delivered,
                  })

                detailData.push(detail)
              }
            })
          )

          data.detail = detailData

          // #2
          await this.generalReceiveNoteModel
            .create({
              ...data,
              created_by: account,
            })
            .then((result) => {
              response.message = 'General receive note created successfully'
              response.statusCode = `${modCodes[this.constructor.name]}_I_${
                modCodes.Global.success
              }`
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `General receive note failed to create. ${error.message}`
              response.statusCode = `${modCodes[this.constructor.name]}_I_${
                modCodes.Global.failed
              }`
              response.payload = error
            })
        } else {
          response.message = `General receive note failed to create.`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
        }
      })
      .catch((error: Error) => {
        response.message = `General receive note failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }
}
