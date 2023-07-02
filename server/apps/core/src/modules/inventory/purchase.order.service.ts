import { Account } from '@core/account/schemas/account.model'
import { MasterItemService } from '@core/master/master.item.service'
import {
  PurchaseOrderAddDTO,
  PurchaseOrderApproval,
  PurchaseOrderEditDTO,
} from '@inventory/dto/purchase.order'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@inventory/schemas/purchase.order'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientKafka } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
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
    @Inject('INVENTORY_SERVICE') private readonly clientInventory: ClientKafka
  ) {
    this.testEmitter()
  }

  async testEmitter() {
    for (let a = 0; a <= 10; a++) {
      await this.clientInventory.emit(
        this.configService.get<string>('kafka.inventory.topic.purchase_order'),
        {
          data: a,
        }
      )
    }
  }

  async all(parameter: any) {
    return await prime_datatable(parameter, this.purchaseOrderModel)
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
    account: Account,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const generatedID = new Types.ObjectId().toString()

    const emitter = await this.clientInventory.emit(
      this.configService.get<string>('kafka.inventory.topic.purchase_order'),
      {
        action: 'add',
        id: generatedID,
        data: data,
        account: account,
        token: token,
      }
    )

    if (emitter) {
      response.message = 'Purchase Order created successfully'
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.success
      }`
      response.transaction_id = `purchase_order-${generatedID}`
    } else {
      response.message = `Purchase Order failed to create`
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.failed
      }`
    }

    return response
  }

  async askApproval(
    data: PurchaseOrderApproval,
    id: string,
    account: Account,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
          const emitter = await this.clientInventory.emit(
            this.configService.get<string>(
              'kafka.inventory.topic.purchase_order'
            ),
            {
              action: 'ask_approval',
              id: id,
              data: data,
              account: account,
              token: token,
            }
          )
          if (emitter) {
            response.message = 'Purchase order proposed successfully'
            response.statusCode = `${modCodes[this.constructor.name]}_U_${
              modCodes.Global.success
            }`
            response.transaction_id = id
            response.payload = result
          } else {
            response.message = `Purchase Order failed to proposed`
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.failed
            }`
            response.transaction_id = id
          }
        } else {
          response.message = `Purchase order failed to proposed. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase order failed to proposed. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
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
      statusCode: '',
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
          const emitter = await this.clientInventory.emit(
            this.configService.get<string>(
              'kafka.inventory.topic.purchase_order'
            ),
            {
              action: 'approve',
              id: id,
              data: data,
              account: account,
              token: token,
            }
          )
          if (emitter) {
            response.message = 'Purchase order approved successfully'
            response.statusCode = `${modCodes[this.constructor.name]}_U_${
              modCodes.Global.success
            }`
            response.transaction_id = id
            response.payload = result
          } else {
            response.message = `Purchase Order failed to approved`
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.failed
            }`
            response.transaction_id = id
          }
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
    account: Account,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
          this.clientInventory
            .emit(
              this.configService.get<string>(
                'kafka.inventory.topic.purchase_order'
              ),
              {
                action: 'decline',
                id: id,
                data: data,
                account: account,
                token: token,
              }
            )
            .subscribe({
              next: () => {
                response.message = 'Purchase order declined successfully'
                response.statusCode = `${modCodes[this.constructor.name]}_U_${
                  modCodes.Global.success
                }`
                response.transaction_id = id
                response.payload = result
              },
              error: (onError) => {
                response.message = `Purchase Order failed to decline. ${onError.message}`
                response.statusCode = `${modCodes[this.constructor.name]}_I_${
                  modCodes.Global.failed
                }`
                response.transaction_id = id
              },
            })
        } else {
          response.message = `Purchase order failed to decline. Invalid document`
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
    data: PurchaseOrderEditDTO,
    id: string,
    account: Account,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
          const emitter = await this.clientInventory.emit(
            this.configService.get<string>(
              'kafka.inventory.topic.purchase_order'
            ),
            {
              action: 'edit',
              id: id,
              data: data,
              token: token,
              account: account,
            }
          )
          if (emitter) {
            response.message = 'Purchase Order updated successfully'
            response.statusCode = `${modCodes[this.constructor.name]}_U_${
              modCodes.Global.success
            }`
            response.transaction_id = id
            response.payload = result
          } else {
            response.message = `Purchase Order failed to update. Invalid document`
            response.statusCode = `${modCodes[this.constructor.name]}_U_${
              modCodes.Global.failed
            }`
            response.transaction_id = id
            response.payload = {}
          }
        } else {
          response.message = `Purchase Order failed to update. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.transaction_id = id
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Purchase Order failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
        response.transaction_id = id
        response.payload = {}
      })
    return response
  }

  async delete(
    id: string,
    account: Account,
    token: string
  ): Promise<GlobalResponse> {
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

      const emitter = await this.clientInventory.emit(
        this.configService.get<string>('kafka.inventory.topic.purchase_order'),
        {
          action: 'delete',
          id: id,
          data: data,
          account: account,
          token: token,
        }
      )
      if (emitter) {
        response.message = 'Purchase order deleted successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_D_${
          modCodes.Global.success
        }`
        response.transaction_id = id
        response.payload = {}
      } else {
        response.message = 'Purchase order failed to delete'
        response.statusCode = `${modCodes[this.constructor.name]}_D_${
          modCodes.Global.failed
        }`
        response.transaction_id = id
        response.payload = {}
      }
    } else {
      response.message = `Purchase order failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }
}
