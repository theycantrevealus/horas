import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import {
  PurchaseRequisition,
  PurchaseRequisitionDocument,
} from '@schemas/inventory/purchase.requisition'
import { PrimeParameter } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { codeGenerator } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'

import {
  PurchaseRequisitionAddDTO,
  PurchaseRequisitionEditDTO,
} from './dto/purchase.requisition'
import { PurchaseRequisitionApprovalDTO } from './dto/purchase.requisition.approval'

@Injectable()
export class GatewayInventoryPurchaseRequisitionService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(PurchaseRequisition.name, 'primary')
    private readonly purchaseRequisitionModel: Model<PurchaseRequisitionDocument>,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        parameter,
        this.purchaseRequisitionModel
      ).catch((error: Error) => {
        throw error
      })
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.purchaseRequisitionModel
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

  async add(data: PurchaseRequisitionAddDTO, account: IAccount) {
    if (!data.code) {
      const now = new Date()
      await this.purchaseRequisitionModel
        .countDocuments({
          created_at: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          },
        })
        .then((counter) => {
          data.code = codeGenerator(
            modCodes[this.constructor.name.toString().split('Service')[0]]
              .defaultCode,
            counter
          )
          // data.code = `${modCodes[this.constructor.name.toString().split('Service')[0]].defaultCode}-${new Date()
          //   .toJSON()
          //   .slice(0, 7)
          //   .replace(/-/g, '/')}/${pad('000000', counter + 1, true)}`
        })
    }

    return await this.purchaseRequisitionModel
      .create({
        locale: await this.cacheManager
          .get('APPLICATION_LOCALE')
          .then((response: IConfig) => {
            return response.setter
          }),
        ...data,
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: PurchaseRequisitionEditDTO, id: string, account: IAccount) {
    return await this.purchaseRequisitionModel
      .findOneAndUpdate(
        {
          id: id,
          created_by: account,
          __v: data.__v,
        },
        {
          $set: {
            transaction_date: data.transaction_date,
            material_requisition: data.material_requisition,
            detail: data.detail,
            extras: data.extras,
            remark: data.remark,
          },
        },
        { upsert: false, new: false }
      )
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

  async delete(id: string, account: IAccount) {
    return await this.purchaseRequisitionModel
      .findOneAndUpdate(
        {
          id: id,
          created_by: account,
        },
        {
          deleted_at: new TimeManagement().getTimezone(
            this.configService.get<string>('application.timezone')
          ),
        }
      )
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
   * @description Propose adjustment for approval
   * @param { PurchaseRequisitionApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async askApproval(
    data: PurchaseRequisitionApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.purchaseRequisitionModel
      .findOneAndUpdate(
        { id: id, 'created_by.id': account.id, status: 'new', __v: data.__v },
        {
          $set: {
            status: 'need_approval',
          },
          $push: {
            approval_history: {
              status: 'need_approval',
              remark: data.remark,
              logged_at: new TimeManagement().getTimezone(
                this.configService.get<string>('application.timezone')
              ),
              created_by: account,
            },
          },
        }
      )
      .then(async (result) => {
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
   * @description Approve adjustment
   * @param { PurchaseRequisitionApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async approve(
    data: PurchaseRequisitionApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.purchaseRequisitionModel
      .findOneAndUpdate(
        {
          id: id,
          'created_by.id': account.id,
          status: 'need_approval',
          __v: data.__v,
        },
        {
          $set: {
            status: 'approved',
          },
          $push: {
            approval_history: {
              status: 'approved',
              remark: data.remark,
              logged_at: new TimeManagement().getTimezone(
                this.configService.get<string>('application.timezone')
              ),
              created_by: account,
            },
          },
        }
      )
      .then(async (result) => {
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
   * @description Decline adjustment
   * @param { PurchaseRequisitionApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async decline(
    data: PurchaseRequisitionApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.purchaseRequisitionModel
      .findOneAndUpdate(
        {
          id: id,
          'created_by.id': account.id,
          status: 'need_approval',
          __v: data.__v,
        },
        {
          $set: {
            status: 'declined',
          },
          $push: {
            approval_history: {
              status: 'declined',
              remark: data.remark,
              logged_at: new TimeManagement().getTimezone(
                this.configService.get<string>('application.timezone')
              ),
              created_by: account,
            },
          },
        }
      )
      .then(async (result) => {
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
   * @description Cancel adjustment
   * @param { PurchaseRequisitionApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async cancel(
    data: PurchaseRequisitionApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.purchaseRequisitionModel
      .findOneAndUpdate(
        {
          id: id,
          'created_by.id': account.id,
          status: 'new',
          __v: data.__v,
        },
        {
          $set: {
            status: 'cancelled',
          },
          $push: {
            approval_history: {
              status: 'cancelled',
              remark: data.remark,
              logged_at: new TimeManagement().getTimezone(
                this.configService.get<string>('application.timezone')
              ),
              created_by: account,
            },
          },
        }
      )
      .then(async (result) => {
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

  async notifier(payload: any, account: IAccount, token: string) {
    await this.socketProxy
      .reconnect({
        extraHeaders: {
          Authorization: `${token}`,
        },
      })
      .then(async (clientSet: Socket) => {
        clientSet.emit('proceed', {
          sender: account,
          receiver: null,
          payload: payload,
        } satisfies ProceedDataTrafficDTO)
      })
      .catch((error: Error) => {
        throw error
      })
  }
}
