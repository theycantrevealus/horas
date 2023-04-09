import { Account } from '@core/account/schemas/account.model'
import { MasterItemService } from '@core/master/master.item.service'
import { IMasterItem } from '@core/master/schemas/master.item.join'
import {
  PurchaseOrderAddDTO,
  PurchaseOrderApproval,
  PurchaseOrderEditDTO,
} from '@inventory/dto/purchase.order'
import {
  IPurchaseOrder,
  IPurchaseOrderApproval,
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@inventory/schemas/purchase.order'
import { IPurchaseOrderDetail } from '@inventory/schemas/purchase.order.detail'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { pad } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrderDocument>,

    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService
  ) {}

  async detail(id: string): Promise<PurchaseOrder> {
    return this.purchaseOrderModel.findOne({ id: id, deleted_at: null }).exec()
  }

  async add(
    generatedID: string,
    payload: PurchaseOrderAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    /*
     * #1. Prepare for the data
     *     a. Prepare code
     *     b. Calculate price
     * #2. Save the data
     * */
    const data: IPurchaseOrder = new IPurchaseOrder({
      id: `purchase_order-${generatedID}`,
      ...payload,
      total: 0,
      grand_total: 0,
      status: 'new',
    })

    const detailData: IPurchaseOrderDetail[] = []

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
      await this.purchaseOrderModel
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

    data.detail.forEach((row, e) => {
      const detail: IPurchaseOrderDetail = new IPurchaseOrderDetail({
        ...row,
        total: 0,
      })

      const itemTotal = row.qty * row.price
      let totalRow = 0
      if (row.discount_type === 'n') {
        totalRow = itemTotal
      } else if (row.discount_type === 'p') {
        totalRow = itemTotal - (itemTotal * row.discount_value) / 100
      } else if (row.discount_type === 'v') {
        totalRow = itemTotal - row.discount_value
      }

      detail.total = totalRow
      data.total += totalRow
      detailData.push(detail)
    })

    data.detail = detailData

    if (data.discount_type === 'p') {
      data.grand_total = data.total - (data.total * data.discount_value) / 100
    } else if (data.discount_type === 'v') {
      data.grand_total = data.total - data.discount_value
    }

    data.approval_history = [
      new IPurchaseOrderApproval({
        status: 'new',
        remark: data.remark,
        created_by: account,
      }),
    ]

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

  async approve(
    data: PurchaseOrderApproval,
    id: string,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_APPROVE',
      transaction_id: null,
    } satisfies GlobalResponse

    const status = new IPurchaseOrderApproval({
      status: data.status,
      remark: data.remark,
      created_by: account,
    })

    await this.purchaseOrderModel
      .findOneAndUpdate(
        { id: id, status: 'new', __v: data.__v },
        { status: data.status, $push: { approval_history: status } }
      )
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'Purchase order approved successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Purchase order failed to approve. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase order failed to approve. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
      })

    return response
  }

  async decline(
    data: PurchaseOrderApproval,
    id: string,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_DECLINE',
      transaction_id: null,
    } satisfies GlobalResponse

    const status = new IPurchaseOrderApproval({
      status: data.status,
      remark: data.remark,
      created_by: account,
    })

    await this.purchaseOrderModel
      .findOneAndUpdate(
        { id: id, status: { $ne: 'approved' }, __v: data.__v },
        { status: data.status, $push: { approval_history: status } }
      )
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'Purchase order approved successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Purchase order failed to approve. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase order failed to approve. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
      })

    return response
  }

  async edit(
    payload: PurchaseOrderEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    const data: IPurchaseOrder = new IPurchaseOrder({
      ...payload,
      total: 0,
      grand_total: 0,
      status: 'new',
    })

    const detailData: IPurchaseOrderDetail[] = []

    data.detail.forEach((row, e) => {
      const detail: IPurchaseOrderDetail = new IPurchaseOrderDetail({
        ...row,
        total: 0,
      })

      const itemTotal = row.qty * row.price
      let totalRow = 0
      if (row.discount_type === 'n') {
        totalRow = itemTotal
      } else if (row.discount_type === 'p') {
        totalRow = itemTotal - (itemTotal * row.discount_value) / 100
      } else if (row.discount_type === 'v') {
        totalRow = itemTotal - row.discount_value
      }

      detail.total = totalRow
      data.total += totalRow
      detailData.push(detail)
    })

    data.detail = detailData

    if (data.discount_type === 'p') {
      data.grand_total = data.total - (data.total * data.discount_value) / 100
    } else if (data.discount_type === 'v') {
      data.grand_total = data.total - data.discount_value
    }

    await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          id: id,
          status: {
            $ne: 'approved',
          },
          __v: payload.__v,
        },
        {
          supplier: data.supplier,
          purchase_date: data.purchase_date,
          detail: data.detail,
          total: data.total,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          grand_total: data.grand_total,
          remark: data.remark,
        }
      )
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'Purchase Order updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Purchase Order failed to update. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase Order failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
      })
    return response
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.purchaseOrderModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Purchase order deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Purchase order failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Purchase order failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }

  async update_receive(id: string, item: IMasterItem, delivered: number) {
    return await this.purchaseOrderModel
      .updateOne(
        {
          id: id,
          'detail.item.id': item.id,
        },
        {
          $set: {
            'detail.$.delivered': delivered,
          },
        }
      )
      .exec()
  }
}