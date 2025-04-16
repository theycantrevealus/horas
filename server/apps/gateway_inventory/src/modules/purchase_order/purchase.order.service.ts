import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { IPurchaseOrder } from '@inventory/interface/purchase.order'
import { IPurchaseOrderApproval } from '@inventory/interface/purchase.order.approval'
import { IPurchaseOrderDetail } from '@inventory/interface/purchase.order.detail'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@schemas/inventory/purchase.order'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { pad } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model, Types } from 'mongoose'

import {
  PurchaseOrderAddDTO,
  PurchaseOrderApproval,
  PurchaseOrderEditDTO,
} from './dto/purchase.order'

@Injectable()
export class PurchaseOrderService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(PurchaseOrder.name, 'primary')
    private purchaseOrderModel: Model<PurchaseOrderDocument>,

    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async all(payload: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.purchaseOrderModel).then(
        (result) => {
          response.payload = result
          response.message = 'Purchase order fetch successfully'
          return response
        }
      )
    } catch (error) {
      response.message = `Purchase order failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async detail(id: string): Promise<PurchaseOrder> {
    return this.purchaseOrderModel.findOne({ id: id, deleted_at: null }).exec()
  }

  async uncompletedDelivery(parameter: any) {
    parameter.custom_filter = [
      { $expr: { $ne: ['$detail.qty', '$detail.delivered'] } },
      { status: 'approved' },
    ]
    return await prime_datatable(parameter, this.purchaseOrderModel)
  }

  async add(
    payload: PurchaseOrderAddDTO,
    account: IAccount
  ): Promise<GlobalResponse> {
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

    const generatedID = new Types.ObjectId().toString()
    const data: IPurchaseOrder = {
      id: `purchase_order-${generatedID}`,
      ...payload,
      approval_history: [],
      total: 0,
      grand_total: 0,
      status: 'new',
    }

    const detailData: IPurchaseOrderDetail[] = []

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

    data.detail.forEach((row) => {
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
    account: IAccount
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

    data.status = 'need_approval'

    const status: IPurchaseOrderApproval = {
      status: data.status,
      remark: data.remark,
      logged_at: new TimeManagement().getTimezone(
        this.configService.get<string>('application.timezone')
      ),
      created_by: account,
    }

    await this.purchaseOrderModel
      .findOneAndUpdate(
        { id: id, status: 'new', created_by: account, __v: data.__v },
        {
          $set: {
            status: 'need_approval',
          },
          $push: {
            approval_history: status,
          },
        }
      )
      .then(async (result) => {
        if (result) {
          response.message = 'Purchase order proposed successfully'
          response.transaction_id = id
          response.payload = result
        } else {
          response.message = `Purchase order failed to proposed. Invalid document`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase order failed to proposed. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async approve(
    data: PurchaseOrderApproval,
    id: string,
    account: IAccount
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

    data.status = 'approved'

    const status: IPurchaseOrderApproval = {
      status: data.status,
      remark: data.remark,
      logged_at: new TimeManagement().getTimezone(
        this.configService.get<string>('application.timezone')
      ),
      created_by: account,
    }

    await this.purchaseOrderModel
      .findOneAndUpdate(
        { id: id, status: 'need_approval', __v: data.__v },
        {
          $set: {
            status: 'approved',
          },
          $push: {
            approval_history: status,
          },
        }
      )
      .then(async (result) => {
        if (result) {
          response.message = 'Purchase order approved successfully'
          response.transaction_id = id
          response.payload = result
        } else {
          response.message = `Purchase order failed to approve. Invalid document`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase order failed to approve. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async decline(
    data: PurchaseOrderApproval,
    id: string,
    account: IAccount
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

    data.status = 'declined'

    const status: IPurchaseOrderApproval = {
      status: data.status,
      remark: data.remark,
      logged_at: new TimeManagement().getTimezone(
        this.configService.get<string>('application.timezone')
      ),
      created_by: account,
    }

    await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          id: id,
          status: 'need_approval',
          __v: data.__v,
        },
        {
          $set: {
            status: 'declined',
          },
          $push: {
            approval_history: status,
          },
        }
      )
      .then(async (result) => {
        if (result) {
          response.message = 'Purchase order approved successfully'
          response.transaction_id = id
          response.payload = result
        } else {
          response.message = `Purchase order failed to decline. Invalid document`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase order failed to approve. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async edit(
    data: PurchaseOrderEditDTO,
    id: string,
    account: IAccount
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

    await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          $and: [
            { id: id, created_by: account, __v: data.__v },
            { $or: [{ status: 'new' }, { status: 'declined' }] },
          ],
        },
        {
          $set: data,
        }
      )
      .then(async (result) => {
        if (result) {
          response.message = 'Purchase Order updated successfully'
          response.transaction_id = id
          response.payload = result
        } else {
          response.message = `Purchase Order failed to update. Invalid document`
          response.transaction_id = id
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase Order failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
    return response
  }

  async delete(id: string, account: IAccount): Promise<GlobalResponse> {
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

    await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          id: id,
          created_by: account,
        },
        {
          $set: {
            deleted_at: new TimeManagement().getTimezone(
              this.configService.get<string>('application.timezone')
            ),
          },
        }
      )
      .then((result) => {
        if (result) {
          response.message = 'Purchase Order deleted successfully'
          response.transaction_id = id
          response.payload = result
        } else {
          response.message = `Purchase Order failed to delete. Invalid document`
          response.transaction_id = id
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase Order failed to delete. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }
}
