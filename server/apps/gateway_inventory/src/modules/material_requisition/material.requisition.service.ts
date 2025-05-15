import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import {
  MaterialRequisition,
  MaterialRequisitionDocument,
} from '@schemas/inventory/material.requisition'
import { PrimeParameter } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { pad } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'

import {
  MaterialRequisitionAddDTO,
  MaterialRequisitionEditDTO,
} from './dto/material.requisition'
import { MaterialRequisitionApproval } from './dto/material.requisition.approval'

@Injectable()
export class GatewayInventoryMaterialRequisitionService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(MaterialRequisition.name, 'primary')
    private readonly materialRequisitionModel: Model<MaterialRequisitionDocument>,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService
  ) {}

  async all(payload: any, account: IAccount) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        {
          filters: {
            stock_point: account.stock_point,
            ...parameter.filters,
          },
          ...parameter,
        },
        this.materialRequisitionModel
      ).catch((error: Error) => {
        throw error
      })
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.materialRequisitionModel
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

  async add(data: MaterialRequisitionAddDTO, account: IAccount) {
    if (!data.code) {
      const now = new Date()
      await this.materialRequisitionModel
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

    return await this.materialRequisitionModel
      .create({
        ...data,
        stock_point: data.stock_point,
        approval_history: [
          {
            status: 'new',
            remark: data.remark,
            created_by: account,
            logged_at: new TimeManagement().getTimezone(
              await this.configService.get<string>('application.timezone')
            ),
          },
        ],
        locale: await this.cacheManager
          .get('APPLICATION_LOCALE')
          .then((response: IConfig) => {
            return response.setter
          }),
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: MaterialRequisitionEditDTO, id: string, account: IAccount) {
    const { __v, ...dataSet } = data
    return await this.materialRequisitionModel
      .findOneAndUpdate(
        { id: id, 'created_by.id': account.id, status: 'new', __v: __v },
        dataSet
      )
      .then((result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error) => {
        throw error
      })
  }

  async delete(id: string, account: IAccount) {
    return await this.materialRequisitionModel
      .findOneAndDelete({ id: id, 'created_by.id': account.id, status: 'new' })
      .then(async (result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error) => {
        throw error
      })
  }

  /**
   * @description Propose for approval
   * @param { MaterialRequisitionApproval } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async askApproval(
    data: MaterialRequisitionApproval,
    id: string,
    account: IAccount
  ) {
    return await this.materialRequisitionModel
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
      .catch((error) => {
        throw error
      })
  }

  /**
   * @description Approve MR
   * @param { MaterialRequisitionApproval } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async approve(
    data: MaterialRequisitionApproval,
    id: string,
    account: IAccount
  ) {
    return await this.materialRequisitionModel
      .findOneAndUpdate(
        {
          id: id,
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
      .catch((error) => {
        throw error
      })
  }

  /**
   * @description Decline MR
   * @param { MaterialRequisitionApproval } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async decline(
    data: MaterialRequisitionApproval,
    id: string,
    account: IAccount
  ) {
    return await this.materialRequisitionModel
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
      .catch((error) => {
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
