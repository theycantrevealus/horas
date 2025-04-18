import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import { Mutation, MutationDocument } from '@schemas/inventory/mutation'
import { PrimeParameter } from '@utility/dto/prime'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { CompressionTypes } from 'kafkajs'
import { Connection, Model } from 'mongoose'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'

import { MutationAddDTO, MutationEditDTO } from './dto/mutation'
import { MutationApprovalDTO } from './dto/mutation.approval'

@Injectable()
export class GatewayInventoryMutationService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectConnection('primary') private mongoConnection: Connection,

    @InjectModel(Mutation.name, 'primary')
    private readonly mutationModel: Model<MutationDocument>,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService
  ) {}

  async all(payload: any, account: IAccount) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        {
          custom_filter: [
            {
              logic: 'or',
              filter: {
                from: account.stock_point,
              },
            },
            {
              logic: 'or',
              filter: {
                to: account.stock_point,
              },
            },
          ],
          ...parameter,
        },
        this.mutationModel
      )
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.mutationModel
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

  async add(data: MutationAddDTO, account: IAccount) {
    return await this.mutationModel
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

  async askApproval(data: MutationApprovalDTO, id: string, account: IAccount) {
    return await this.mutationModel
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

  async approve(data: MutationApprovalDTO, id: string, account: IAccount) {
    return await this.mutationModel
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

  async decline(data: MutationApprovalDTO, id: string, account: IAccount) {
    return await this.mutationModel
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
   * proceed - Mutation processor
   * Execute stock logic of mutation
   *
   * @param { MutationApprovalDTO } data - Approval information
   * @param { string } id - Mutation id
   * @param { IAccount } account - Account credential
   * @returns { any } Mutation model result
   */
  async proceed(
    data: MutationApprovalDTO,
    id: string,
    account: IAccount,
    token: string
  ) {
    const session = await this.mongoConnection.startSession()
    const transaction = await this.clientStock.transaction('stock_mutation')

    try {
      const mongoTransaction = await session.withTransaction(async () => {
        return await this.mutationModel
          .findOneAndUpdate(
            {
              id: id,
              'created_by.id': account.id,
              status: 'approved',
              __v: data.__v,
            },
            {
              $set: {
                status: 'proceed',
              },
              $push: {
                approval_history: {
                  status: 'proceed',
                  remark: data.remark,
                  logged_at: new TimeManagement().getTimezone(
                    this.configService.get<string>('application.timezone')
                  ),
                  created_by: account,
                },
              },
            },
            { session: session }
          )
          .then(async (result) => {
            if (result) {
              const items = []
              result.detail.forEach((item) => {
                items.push({
                  headers: {
                    ...account,
                    token: token,
                  },
                  key: {
                    id: result.id.toString(),
                    code: result.id.toString(),
                    service: 'stock',
                    method: 'stock_movement',
                  },
                  value: {
                    batch: item.batch,
                    from: result.from,
                    to: result.to,
                    qty: item.qty,
                    transaction_id: result.id.toString(),
                    logged_at: new Date().toString(),
                  },
                })
              })

              await transaction.send({
                acks: -1,
                timeout: 5000,
                compression: CompressionTypes.None,
                topic: this.configService.get<string>(
                  'kafka.stock.topic.stock'
                ),
                messages: items,
              })

              await transaction.commit()

              return result
            } else {
              await transaction.abort()
              throw new NotFoundException()
            }
          })
      })

      await session.endSession()

      return mongoTransaction
    } catch (error) {
      await transaction.abort()
      throw error
    }
  }

  async edit(data: MutationEditDTO, id: string, account: IAccount) {
    return await this.mutationModel
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

  async delete(id: string, account: IAccount) {
    return await this.mutationModel
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
