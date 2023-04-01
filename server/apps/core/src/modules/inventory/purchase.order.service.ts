import { Account } from '@core/account/schemas/account.model'
import { PurchaseOrderAddDTO } from '@core/inventory/dto/purchase.order'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@core/inventory/schemas/purchase.order'
import { MasterItemService } from '@core/master/master.item.service'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { pad } from '@utility/string'
import { Model } from 'mongoose'

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrderDocument>,

    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.purchaseOrderModel)
  }

  async detail(id: string): Promise<PurchaseOrder> {
    return this.purchaseOrderModel.findOne({ id: id }).exec()
  }

  async add(
    data: PurchaseOrderAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    /*
     * #1. Prepare for the data
     * #2. Save the data
     * */
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    // #1
    if (!data.code) {
      const now = new Date()
      const counter = await this.purchaseOrderModel
        .count({
          created_at: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          },
        })
        .then((result) => result++)

      data.code = `${modCodes[this.constructor.name]}-${new Date()
        .toJSON()
        .slice(0, 7)
        .replace(/-/g, '/')}/${pad('000000', counter, true)}`
    }

    // #2
    await this.purchaseOrderModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'Purchase Order created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Purchase Order failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  // async edit(
  //   data: MasterItemBrandEditDTO,
  //   id: string
  // ): Promise<GlobalResponse> {
  //   const response = {
  //     statusCode: '',
  //     message: '',
  //     payload: {},
  //     transaction_classify: 'MASTER_ITEM_BRAND_EDIT',
  //     transaction_id: null,
  //   } satisfies GlobalResponse
  //
  //   await this.masterItemBrandModel
  //     .findOneAndUpdate(
  //       {
  //         id: id,
  //         __v: data.__v,
  //       },
  //       {
  //         code: data.code,
  //         name: data.name,
  //         remark: data.remark,
  //       }
  //     )
  //     .exec()
  //     .then((result) => {
  //       if (result) {
  //         response.message = 'Master item brand updated successfully'
  //         response.statusCode = `${modCodes[this.constructor.name]}_U_${
  //           modCodes.Global.success
  //         }`
  //         response.payload = result
  //       } else {
  //         response.message = `Master item brand failed to update. Invalid document`
  //         response.statusCode = `${modCodes[this.constructor.name]}_U_${
  //           modCodes.Global.failed
  //         }`
  //         response.payload = {}
  //       }
  //     })
  //     .catch((error: Error) => {
  //       response.message = `Master item brand failed to update. ${error.message}`
  //       response.statusCode = `${modCodes[this.constructor.name]}_U_${
  //         modCodes.Global.failed
  //       }`
  //     })
  //   return response
  // }
  //
  // async delete(id: string): Promise<GlobalResponse> {
  //   const response = {
  //     statusCode: '',
  //     message: '',
  //     payload: {},
  //     transaction_classify: 'MASTER_ITEM_BRAND_DELETE',
  //     transaction_id: null,
  //   } satisfies GlobalResponse
  //   const data = await this.masterItemBrandModel.findOne({
  //     id: id,
  //   })
  //
  //   if (data) {
  //     data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')
  //
  //     await data
  //       .save()
  //       .then((result) => {
  //         response.message = 'Master item brand deleted successfully'
  //         response.statusCode = `${modCodes[this.constructor.name]}_D_${
  //           modCodes.Global.success
  //         }`
  //       })
  //       .catch((error: Error) => {
  //         response.message = `Master item brand failed to delete. ${error.message}`
  //         response.statusCode = `${modCodes[this.constructor.name]}_D_${
  //           modCodes.Global.failed
  //         }`
  //         response.payload = error
  //       })
  //   } else {
  //     response.message = `Master item brand failed to deleted. Invalid document`
  //     response.statusCode = `${modCodes[this.constructor.name]}_D_${
  //       modCodes.Global.failed
  //     }`
  //     response.payload = {}
  //   }
  //   return response
  // }
}
