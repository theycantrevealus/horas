import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Account } from '@core/account/schemas/account.model'
import {
  PurchaseOrderAddDTO,
  PurchaseOrderApproval,
  PurchaseOrderEditDTO,
} from '@inventory/dto/purchase.order'
import { IPurchaseOrder } from '@inventory/interface/purchase.order'
import { IPurchaseOrderDetail } from '@inventory/interface/purchase.order.detail'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@inventory/schemas/purchase.order'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { pad } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { IConfig } from '../../core/src/schemas/config'

@Injectable()
export class PurchaseOrderService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrderDocument>,

    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async detail(id: string): Promise<PurchaseOrder> {
    return this.purchaseOrderModel.findOne({ id: id, deleted_at: null }).exec()
  }

  async simple() {}

  async add(
    generatedID: string,
    payload: PurchaseOrderAddDTO,
    account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    /*
     * #1. Prepare for the data
     *     a. Prepare code
     *     b. Calculate price
     * #2. Save the data
     * */
    const data: IPurchaseOrder = {
      id: `purchase_order-${generatedID}`,
      ...payload,
      approval_history: [],
      total: 0,
      grand_total: 0,
      status: 'new',
    }

    const detailData: IPurchaseOrderDetail[] = []

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
    if (!data.code) {
      const now = new Date()
      await this.purchaseOrderModel
        .countDocuments({
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
      const detail = {
        ...row,
        delivered: 0,
        total: 0,
      }

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
      {
        status: 'new',
        remark: data.remark,
        created_by: account,
        logged_at: new TimeManagement().getTimezone('Asia/Jakarta'),
      },
    ]

    // #2
    await this.purchaseOrderModel
      .create({
        ...data,
        locale: await this.cacheManager
          .get('APPLICATION_LOCALE')
          .then((response: IConfig) => {
            return response.setter
          }),
        created_by: account,
      })
      .then(async (result) => {
        response.message = 'Purchase Order created successfully'
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Purchase Order failed to create. ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error
      })

    return response
  }

  async askApproval(
    data: PurchaseOrderApproval,
    id: string,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_APPROVE',
      transaction_id: null,
    } satisfies GlobalResponse
    return response
  }

  // async askApproval(
  //   data: PurchaseOrderApproval,
  //   id: string,
  //   account: Account
  // ): Promise<GlobalResponse> {
  //   const response = {
  //     statusCode: {
  //       defaultCode: HttpStatus.OK,
  //       customCode: modCodes.Global.success,
  //       classCode: modCodes[this.constructor.name].defaultCode,
  //     },
  //     message: '',
  //     payload: {},
  //     transaction_classify: 'PURCHASE_ORDER_APPROVE',
  //     transaction_id: null,
  //   } satisfies GlobalResponse
  //
  //   const status = new IPurchaseOrderApproval({
  //     status: data.status,
  //     remark: data.remark,
  //     created_by: account,
  //   })
  //
  //   await this.purchaseOrderModel
  //     .findOneAndUpdate(
  //       { id: id, status: 'new', __v: data.__v },
  //       { status: data.status, $push: { approval_history: status } }
  //     )
  //     .exec()
  //     .then((result) => {
  //       if (result) {
  //         response.message = 'Purchase order requested to review successfully'
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = result
  //       } else {
  //         response.message = `Purchase order failed to review request. Invalid document`
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = {}
  //       }
  //     })
  //     .catch((error: Error) => {
  //       response.message = `Purchase order failed to review request. ${error.message}`
  //       response.statusCode =
  //         modCodes[this.constructor.name].error.databaseError
  //     })
  //
  //   return response
  // }

  async approve(
    data: PurchaseOrderApproval,
    id: string,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_APPROVE',
      transaction_id: null,
    } satisfies GlobalResponse
    return response
  }

  // async approve(
  //   data: PurchaseOrderApproval,
  //   id: string,
  //   account: Account
  // ): Promise<GlobalResponse> {
  //   const response = {
  //     statusCode: {
  //       defaultCode: HttpStatus.OK,
  //       customCode: modCodes.Global.success,
  //       classCode: modCodes[this.constructor.name].defaultCode,
  //     },
  //     message: '',
  //     payload: {},
  //     transaction_classify: 'PURCHASE_ORDER_APPROVE',
  //     transaction_id: null,
  //   } satisfies GlobalResponse
  //
  //   const status = new IPurchaseOrderApproval({
  //     status: data.status,
  //     remark: data.remark,
  //     created_by: account,
  //   })
  //
  //   await this.purchaseOrderModel
  //     .findOneAndUpdate(
  //       { id: id, status: 'need_approval', __v: data.__v },
  //       { status: data.status, $push: { approval_history: status } }
  //     )
  //     .exec()
  //     .then((result) => {
  //       if (result) {
  //         response.message = 'Purchase order approved successfully'
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = result
  //       } else {
  //         response.message = `Purchase order failed to approve. Invalid document`
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = {}
  //       }
  //     })
  //     .catch((error: Error) => {
  //       response.message = `Purchase order failed to approve. ${error.message}`
  //       response.statusCode =
  //         modCodes[this.constructor.name].error.databaseError
  //     })
  //
  //   return response
  // }

  async decline(
    data: PurchaseOrderApproval,
    id: string,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_DECLINE',
      transaction_id: null,
    } satisfies GlobalResponse
    return response
  }

  // async decline(
  //   data: PurchaseOrderApproval,
  //   id: string,
  //   account: Account
  // ): Promise<GlobalResponse> {
  //   const response = {
  //     statusCode: {
  //       defaultCode: HttpStatus.OK,
  //       customCode: modCodes.Global.success,
  //       classCode: modCodes[this.constructor.name].defaultCode,
  //     },
  //     message: '',
  //     payload: {},
  //     transaction_classify: 'PURCHASE_ORDER_DECLINE',
  //     transaction_id: null,
  //   } satisfies GlobalResponse
  //
  //   const status = new IPurchaseOrderApproval({
  //     status: data.status,
  //     remark: data.remark,
  //     created_by: account,
  //   })
  //
  //   await this.purchaseOrderModel
  //     .findOneAndUpdate(
  //       { id: id, status: 'need_approval', __v: data.__v },
  //       { status: data.status, $push: { approval_history: status } }
  //     )
  //     .exec()
  //     .then((result) => {
  //       if (result) {
  //         response.message = 'Purchase order declined successfully'
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = result
  //       } else {
  //         response.message = `Purchase order failed to decline. Invalid document`
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = {}
  //       }
  //     })
  //     .catch((error: Error) => {
  //       response.message = `Purchase order failed to decline. ${error.message}`
  //       response.statusCode =
  //         modCodes[this.constructor.name].error.databaseError
  //     })
  //
  //   return response
  // }

  async edit(
    payload: PurchaseOrderEditDTO,
    id: string,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse
    return response
  }

  // async edit(
  //   payload: PurchaseOrderEditDTO,
  //   id: string,
  //   account: Account
  // ): Promise<GlobalResponse> {
  //   const response = {
  //     statusCode: {
  //       defaultCode: HttpStatus.OK,
  //       customCode: modCodes.Global.success,
  //       classCode: modCodes[this.constructor.name].defaultCode,
  //     },
  //     message: '',
  //     payload: {},
  //     transaction_classify: 'PURCHASE_ORDER_EDIT',
  //     transaction_id: null,
  //   } satisfies GlobalResponse
  //
  //   const data: IPurchaseOrder = new IPurchaseOrder({
  //     ...payload,
  //     total: 0,
  //     grand_total: 0,
  //     status: 'new',
  //   })
  //
  //   const detailData: IPurchaseOrderDetail[] = []
  //
  //   data.detail.forEach((row, e) => {
  //     const detail: IPurchaseOrderDetail = new IPurchaseOrderDetail({
  //       ...row,
  //       total: 0,
  //     })
  //
  //     const itemTotal = row.qty * row.price
  //     let totalRow = 0
  //     if (row.discount_type === 'n') {
  //       totalRow = itemTotal
  //     } else if (row.discount_type === 'p') {
  //       totalRow = itemTotal - (itemTotal * row.discount_value) / 100
  //     } else if (row.discount_type === 'v') {
  //       totalRow = itemTotal - row.discount_value
  //     }
  //
  //     detail.total = totalRow
  //     data.total += totalRow
  //     detailData.push(detail)
  //   })
  //
  //   data.detail = detailData
  //
  //   if (data.discount_type === 'p') {
  //     data.grand_total = data.total - (data.total * data.discount_value) / 100
  //   } else if (data.discount_type === 'v') {
  //     data.grand_total = data.total - data.discount_value
  //   }
  //
  //   const status = new IPurchaseOrderApproval({
  //     status: 'new',
  //     remark: data.remark,
  //     created_by: account,
  //   })
  //
  //   await this.purchaseOrderModel
  //     .findOneAndUpdate(
  //       {
  //         id: id,
  //         status: {
  //           $ne: 'approved',
  //         },
  //         __v: payload.__v,
  //       },
  //       {
  //         supplier: data.supplier,
  //         purchase_date: data.purchase_date,
  //         detail: data.detail,
  //         total: data.total,
  //         discount_type: data.discount_type,
  //         discount_value: data.discount_value,
  //         grand_total: data.grand_total,
  //         status: 'new',
  //         remark: data.remark,
  //         $push: { approval_history: status },
  //       }
  //     )
  //     .exec()
  //     .then((result) => {
  //       if (result) {
  //         response.message = 'Purchase Order updated successfully'
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = result
  //       } else {
  //         response.message = `Purchase Order failed to update. Invalid document`
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = {}
  //       }
  //     })
  //     .catch((error: Error) => {
  //       response.payload = error
  //       response.message = `Purchase Order failed to update. ${error.message}`
  //       response.statusCode =
  //         modCodes[this.constructor.name].error.databaseError
  //     })
  //   return response
  // }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    return response
  }

  // async delete(id: string): Promise<GlobalResponse> {
  //   const response = {
  //     statusCode: {
  //       defaultCode: HttpStatus.OK,
  //       customCode: modCodes.Global.success,
  //       classCode: modCodes[this.constructor.name].defaultCode,
  //     },
  //     message: '',
  //     payload: {},
  //     transaction_classify: 'PURCHASE_ORDER_DELETE',
  //     transaction_id: null,
  //   } satisfies GlobalResponse
  //   const data = await this.purchaseOrderModel.findOne({
  //     id: id,
  //   })
  //
  //   if (data) {
  //     data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')
  //
  //     await data
  //       .save()
  //       .then(() => {
  //         response.message = 'Purchase order deleted successfully'
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //       })
  //       .catch((error: Error) => {
  //         response.message = `Purchase order failed to delete. ${error.message}`
  //         response.statusCode =
  //           modCodes[this.constructor.name].error.databaseError
  //         response.payload = error
  //       })
  //   } else {
  //     response.message = `Purchase order failed to deleted. Invalid document`
  //     response.statusCode = modCodes[this.constructor.name].error.databaseError
  //     response.payload = {}
  //   }
  //   return response
  // }

  // async update_receive(id: string, item: IMasterItem, delivered: number) {
  //   return await this.purchaseOrderModel
  //     .updateOne(
  //       {
  //         id: id,
  //         'detail.item.id': item.id,
  //       },
  //       {
  //         $set: {
  //           'detail.$.delivered': delivered,
  //         },
  //       }
  //     )
  //     .exec()
  // }
}
