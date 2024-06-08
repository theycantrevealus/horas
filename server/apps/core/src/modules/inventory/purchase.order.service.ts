import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  PurchaseOrderAddDTO,
  PurchaseOrderApproval,
  PurchaseOrderEditDTO,
} from '@inventory/dto/purchase.order'
import { IPurchaseOrderApproval } from '@inventory/interface/purchase.order.approval'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@inventory/schemas/purchase.order'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import { KafkaService } from '@utility/kafka/avro/service'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model, Types } from 'mongoose'

@Injectable()
export class PurchaseOrderService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrderDocument>,

    @Inject('INVENTORY_SERVICE')
    private readonly clientInventory: KafkaService
  ) {
    // @Inject('INVENTORY_SERVICE') private readonly clientInventory: ClientKafka
    //
  }

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
          response.payload = result.payload
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
    data: PurchaseOrderAddDTO,
    credential: IAccountCreatedBy,
    token: string
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
    const transaction = await this.clientInventory.transaction(`purchase_order`)

    try {
      return await transaction
        .send({
          topic: this.configService.get<string>(
            'kafka.inventory.topic.purchase_order'
          ),
          messages: [
            {
              headers: {
                ...credential,
                token: token,
              },
              key: {
                id: `purchase_order-${generatedID}`,
                code: data.code,
                service: 'account',
                method: 'create',
              } satisfies KafkaGlobalKey,
              value: data,
            },
          ],
        })
        .then(async () => {
          await transaction.commit()
          response.message = 'Purchase Order created successfully'
          response.transaction_id = `purchase_order-${generatedID}`
          return response
        })
    } catch (error) {
      await transaction.abort()
      response.message = 'Account failed to create'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async askApproval(
    data: PurchaseOrderApproval,
    id: string,
    account: IAccountCreatedBy
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

    // TODO : Design for document changes history on every collections

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
          const emitter = true
          if (emitter) {
            response.message = 'Purchase order proposed successfully'
            response.transaction_id = id
            response.payload = result
          } else {
            response.message = `Purchase Order failed to proposed`
            response.transaction_id = id
            response.statusCode =
              modCodes[this.constructor.name].error.databaseError
            throw new Error(JSON.stringify(response))
          }
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
    account: IAccountCreatedBy
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
        { id: id, status: 'need_approval', created_by: account, __v: data.__v },
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
    account: IAccountCreatedBy
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
          created_by: account,
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
    account: IAccountCreatedBy
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

  async delete(
    id: string,
    account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
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
