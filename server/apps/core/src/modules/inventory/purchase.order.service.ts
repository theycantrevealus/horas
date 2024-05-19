import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Account } from '@core/account/schemas/account.model'
import { MasterItemService } from '@core/master/services/master.item.service'
import {
  PurchaseOrderAddDTO,
  PurchaseOrderApproval,
  PurchaseOrderEditDTO,
} from '@inventory/dto/purchase.order'
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

    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService,

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

    try {
      return await this.clientInventory
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
        .then(() => {
          response.message = 'Purchase Order created successfully'
          response.transaction_id = `purchase_order-${generatedID}`
          return response
        })
    } catch (error) {
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
    account: Account,
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
      transaction_classify: 'PURCHASE_ORDER_APPROVE',
      transaction_id: null,
    } satisfies GlobalResponse

    data.status = 'need_approval'

    await this.purchaseOrderModel
      .findOne({ id: id, status: 'new', __v: data.__v })
      .exec()
      .then(async (result) => {
        if (result) {
          // const emitter = await this.clientInventory.emit(
          //   this.configService.get<string>(
          //     'kafka.inventory.topic.purchase_order'
          //   ),
          //   {
          //     action: 'ask_approval',
          //     id: id,
          //     data: data,
          //     account: account,
          //     token: token,
          //   }
          // )
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
    account: Account,
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
      transaction_classify: 'PURCHASE_ORDER_APPROVE',
      transaction_id: null,
    } satisfies GlobalResponse

    data.status = 'approved'

    await this.purchaseOrderModel
      .findOne({ id: id, status: 'need_approval', __v: data.__v })
      .exec()
      .then(async (result) => {
        if (result) {
          // const emitter = await this.clientInventory.emit(
          //   this.configService.get<string>(
          //     'kafka.inventory.topic.purchase_order'
          //   ),
          //   {
          //     action: 'approve',
          //     id: id,
          //     data: data,
          //     account: account,
          //     token: token,
          //   }
          // )
          const emitter = true
          if (emitter) {
            response.message = 'Purchase order approved successfully'
            response.transaction_id = id
            response.payload = result
          } else {
            response.message = `Purchase Order failed to approved`
            response.statusCode =
              modCodes[this.constructor.name].error.databaseError
            response.transaction_id = id
            throw new Error(JSON.stringify(response))
          }
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
    account: Account,
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
      transaction_classify: 'PURCHASE_ORDER_DECLINE',
      transaction_id: null,
    } satisfies GlobalResponse

    data.status = 'declined'

    await this.purchaseOrderModel
      .findOne({
        id: id,
        status: 'need_approval',
        __v: data.__v,
      })
      .exec()
      .then(async (result) => {
        if (result) {
          // this.clientInventory
          //   .emit(
          //     this.configService.get<string>(
          //       'kafka.inventory.topic.purchase_order'
          //     ),
          //     {
          //       action: 'decline',
          //       id: id,
          //       data: data,
          //       account: account,
          //       token: token,
          //     }
          //   )
          //   .subscribe({
          //     next: () => {
          //       response.message = 'Purchase order declined successfully'
          //       response.transaction_id = id
          //       response.payload = result
          //     },
          //     error: (onError) => {
          //       response.message = `Purchase Order failed to decline. ${onError.message}`
          //       response.statusCode =
          //         modCodes[this.constructor.name].error.databaseError
          //       response.transaction_id = id
          //       throw new Error(JSON.stringify(response))
          //     },
          //   })
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
    account: Account,
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
      transaction_classify: 'PURCHASE_ORDER_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.purchaseOrderModel
      .findOne({
        $and: [
          { id: id, __v: data.__v },
          { $or: [{ status: 'new' }, { status: 'declined' }] },
        ],
      })
      .exec()
      .then(async (result) => {
        if (result) {
          // const emitter = await this.clientInventory.emit(
          //   this.configService.get<string>(
          //     'kafka.inventory.topic.purchase_order'
          //   ),
          //   {
          //     action: 'edit',
          //     id: id,
          //     data: data,
          //     token: token,
          //     account: account,
          //   }
          // )
          const emitter = true
          if (emitter) {
            response.message = 'Purchase Order updated successfully'
            response.transaction_id = id
            response.payload = result
          } else {
            response.message = `Purchase Order failed to update. Invalid document`
            response.statusCode =
              modCodes[this.constructor.name].error.databaseError
            response.transaction_id = id
            throw new Error(JSON.stringify(response))
          }
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
    account: Account,
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
      transaction_classify: 'PURCHASE_ORDER_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.purchaseOrderModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      // const emitter = await this.clientInventory.emit(
      //   this.configService.get<string>('kafka.inventory.topic.purchase_order'),
      //   {
      //     action: 'delete',
      //     id: id,
      //     data: data,
      //     account: account,
      //     token: token,
      //   }
      // )
      const emitter = true
      if (emitter) {
        response.message = 'Purchase order deleted successfully'
        response.transaction_id = id
        response.payload = {}
      } else {
        response.message = 'Purchase order failed to delete'
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.transaction_id = id
        throw new Error(JSON.stringify(response))
      }
    } else {
      response.message = `Purchase order failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
