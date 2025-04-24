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
  StockAdjustment,
  StockAdjustmentDocument,
} from '@schemas/inventory/adjustment'
import { PrimeParameter } from '@utility/dto/prime'
import { KafkaService } from '@utility/kafka/avro/service'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Queue } from 'bullmq'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Socket } from 'socket.io-client'

import { StockAdjustmentAddDTO, StockAdjustmentEditDTO } from './dto/adjustment'
import { StockAdjustmentApprovalDTO } from './dto/adjustment.approval'

@Injectable()
export class GatewayInventoryStockAdjustmentService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectModel(StockAdjustment.name, 'primary')
    private readonly stockAdjustmentModel: Model<StockAdjustmentDocument>,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService,

    @InjectQueue('stock') private readonly stockImportQueue: Queue
  ) {}

  /**
   * @description List of adjustment
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
        this.stockAdjustmentModel
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * @description Adjustment detail
   * @param { string } id what id to get
   * @returns
   */
  async detail(id: string) {
    return this.stockAdjustmentModel
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
   * @description Add new adjustment
   * @param { StockAdjustmentAddDTO } data
   * @param { IAccount } account
   * @returns
   */
  async add(data: StockAdjustmentAddDTO, account: IAccount) {
    return await this.stockAdjustmentModel
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
   * @description Edit adjustment (Only for status new)
   * @param { StockAdjustmentEditDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async edit(data: StockAdjustmentEditDTO, id: string, account: IAccount) {
    return await this.stockAdjustmentModel
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
   * @description Delete adjustment (Only for status new)
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async delete(id: string, account: IAccount) {
    return await this.stockAdjustmentModel
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
   * @description Propose adjustment for approval
   * @param { StockAdjustmentApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async askApproval(
    data: StockAdjustmentApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockAdjustmentModel
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
   * @param { StockAdjustmentApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async approve(
    data: StockAdjustmentApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockAdjustmentModel
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
   * @param { StockAdjustmentApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async decline(
    data: StockAdjustmentApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.stockAdjustmentModel
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
   * @param { StockAdjustmentApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async process(
    data: StockAdjustmentApprovalDTO,
    id: string,
    account: IAccount,
    token: string
  ) {
    return await this.stockAdjustmentModel
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
            'adjustment-manual',
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
