import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import { StockAudit, StockAuditDocument } from '@schemas/inventory/audit'
import { HORASClassDoc } from '@utility/decorator'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Socket } from 'socket.io-client'

import { StockAuditAddDTO, StockAuditEditDTO } from './dto/audit'
import { StockAuditApprovalDTO } from './dto/audit.approval'

@Injectable()
@HORASClassDoc('GatewayInventoryStockAuditService', 'Stock audit logic service')
export class GatewayInventoryStockAuditService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectModel(StockAudit.name, 'primary')
    private readonly stockAuditModel: Model<StockAuditDocument>,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService
  ) {}

  /**
   * @description Add exist audit
   * @param { any } payload should JSON format string. Try to send wrong format lol
   * @returns
   */
  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        {
          custom_filter: [
            {
              logic: 'or',
              filter: {},
            },
          ],
          ...parameter,
        },
        this.stockAuditModel
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * @description Audit detail
   * @param { string } id what id to get
   * @returns
   */
  async detail(id: string) {
    return this.stockAuditModel
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

  /**
   * @description Add new audit
   * @param { StockAuditAddDTO } data
   * @param { IAccount } account
   * @returns
   */
  async add(data: StockAuditAddDTO, account: IAccount) {
    return await this.stockAuditModel
      .create({
        ...data,
        approval_history: [
          {
            status: 'new',
            remark: data.remark,
            created_by: account,
            logged_at: new TimeManagement().getTimezone('Asia/Jakarta'),
          },
        ],
        created_by: account,
        locale: await this.cacheManager
          .get('APPLICATION_LOCALE')
          .then((response: IConfig) => response.setter),
      })
      .catch((error: Error) => {
        throw error
      })
  }

  /**
   * @description Edit audit (Only for status new)
   * @param { StockAuditEditDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async edit(data: StockAuditEditDTO, id: string, account: IAccount) {
    return await this.stockAuditModel
      .findOneAndUpdate({ id: id, created_by: account, status: 'new' }, data)
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
   * @description Delete audit (Only for status new)
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async delete(id: string, account: IAccount) {
    return await this.stockAuditModel
      .findOneAndUpdate(
        { id: id, created_by: account, status: 'new' },
        {
          deleted_at: new TimeManagement().getTimezone(
            this.configService.get<string>('application.timezone')
          ),
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
   * @description Propose audit for approval
   * @param { StockAuditApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async askApproval(
    data: StockAuditApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockAuditModel
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
   * @description Approve audit
   * @param { StockAuditApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async approve(data: StockAuditApprovalDTO, id: string, account: IAccount) {
    return await this.stockAuditModel
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
   * @description Decline audit
   * @param { StockAuditApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async decline(data: StockAuditApprovalDTO, id: string, account: IAccount) {
    return await this.stockAuditModel
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
   * @description Update audit as running state
   * @param { StockAuditApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async running(data: StockAuditApprovalDTO, id: string, account: IAccount) {
    return await this.stockAuditModel
      .findOneAndUpdate(
        {
          id: id,
          'created_by.id': account.id,
          status: 'approved',
          __v: data.__v,
        },
        {
          $set: {
            status: 'running',
          },
          $push: {
            approval_history: {
              status: 'running',
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
   * @description Update audit as completed state
   * @param { StockAuditApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async completed(data: StockAuditApprovalDTO, id: string, account: IAccount) {
    return await this.stockAuditModel
      .findOneAndUpdate(
        {
          id: id,
          'created_by.id': account.id,
          status: 'running',
          __v: data.__v,
        },
        {
          $set: {
            status: 'completed',
          },
          $push: {
            approval_history: {
              status: 'completed',
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
