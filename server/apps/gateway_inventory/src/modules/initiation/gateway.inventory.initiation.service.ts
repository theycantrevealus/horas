import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { InjectQueue } from '@nestjs/bullmq'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import {
  StockInitiation,
  StockInitiationDocument,
} from '@schemas/inventory/initiation'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Queue } from 'bullmq'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Socket } from 'socket.io-client'

import { StockInitiationAddDTO, StockInitiationEditDTO } from './dto/initiation'
import { StockInitiationApprovalDTO } from './dto/initiation.approval'

@Injectable()
export class GatewayInventoryStockInitiationService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectModel(StockInitiation.name, 'primary')
    private readonly stockInitiationModel: Model<StockInitiationDocument>,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    @InjectQueue('stock') private readonly stockImportQueue: Queue
  ) {}

  /**
   * @description List of initiation
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
        this.stockInitiationModel
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * @description Initiation detail
   * @param { string } id what id to get
   * @returns
   */
  async detail(id: string) {
    return this.stockInitiationModel
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
   * @description Add new initiation
   * @param { StockInitiationAddDTO } data
   * @param { IAccount } account
   * @returns
   */
  async add(data: StockInitiationAddDTO, account: IAccount) {
    return await this.stockInitiationModel
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
   * @description Edit initiation (Only for status new)
   * @param { StockInitiationEditDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async edit(data: StockInitiationEditDTO, id: string, account: IAccount) {
    return await this.stockInitiationModel
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
   * @description Delete initiation (Only for status new)
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async delete(id: string, account: IAccount) {
    return await this.stockInitiationModel
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
   * @description Propose initiation for approval
   * @param { StockInitiationApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async askApproval(
    data: StockInitiationApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockInitiationModel
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
   * @description Approve initiation
   * @param { StockInitiationApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async approve(
    data: StockInitiationApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockInitiationModel
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
   * @description Decline initiation
   * @param { StockInitiationApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async decline(
    data: StockInitiationApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockInitiationModel
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
   * @description Update initiation as completed state
   * @param { StockInitiationApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @param { string } token
   * @returns
   */
  async running(
    data: StockInitiationApprovalDTO,
    id: string,
    account: IAccount,
    token: string
  ) {
    return await this.stockInitiationModel
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
          await this.stockImportQueue.add(
            'initiation',
            {
              payload: result,
              account: account,
              token: token,
            },
            { removeOnComplete: true }
          )
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
   * @description Update initiation as completed state
   * @param { StockInitiationApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async completed(
    data: StockInitiationApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockInitiationModel
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
