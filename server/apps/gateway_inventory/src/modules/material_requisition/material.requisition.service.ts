import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import {
  MaterialRequisition,
  MaterialRequisitionDocument,
} from '@schemas/inventory/material.requisition'
import { IMaterialRequisitionApproval } from '@schemas/inventory/material.requisition.interface'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
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
export class MaterialRequisitionService {
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

  async list(payload: any, account: IAccount): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MATERIAL_REQUISITION_GET',
      transaction_id: '',
    } satisfies GlobalResponse

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
      ).then((result) => {
        response.payload = result
        response.message = 'Material requisition fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Material requisition failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MaterialRequisitionAddDTO,
    account: IAccount,
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
      transaction_classify: 'MATERIAL_REQUISITION_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

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
      .then(async (result) => {
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result._id
        response.payload = result

        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: `${token}`,
            },
          })
          .then(async (clientSet: Socket) => {
            response.message =
              'Material requisition created and notified successfully'

            clientSet.emit('proceed', {
              sender: account,
              receiver: null,
              payload: response,
            } satisfies ProceedDataTrafficDTO)
          })
          .catch((e: Error) => {
            response.message = 'Material requisition created successfully'
            this.logger.error(`Failed to connect: ${e}]`)
          })

        return response
      })
      .catch((error: Error) => {
        response.message = `Material requisition failed to create. ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error

        return response
      })
  }

  async edit(
    data: MaterialRequisitionEditDTO,
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
      transaction_classify: 'MATERIAL_REQUISITION_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    return await this.materialRequisitionModel
      .findOneAndUpdate({ id: id, created_by: account, status: 'new' }, data)
      .then((result) => {
        response.message = 'Material requisition updated successfully'
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result._id
        response.payload = result
        return response
      })
      .catch((error) => {
        response.message = `Material requisition failed to update : ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error

        return response
      })
  }

  async delete(
    id: string,
    account: IAccount,
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
      transaction_classify: 'MATERIAL_REQUISITION_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    return await this.materialRequisitionModel
      .findOneAndDelete({ id: id, created_by: account, status: 'new' })
      .then(async (result) => {
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result._id
        response.payload = result

        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: `${token}`,
            },
          })
          .then(async (clientSet: Socket) => {
            response.message =
              'Material requisition deleted and notified successfully'

            clientSet.emit('proceed', {
              sender: account,
              receiver: null,
              payload: response,
            } satisfies ProceedDataTrafficDTO)
          })
          .catch((e: Error) => {
            response.message = 'Material requisition deleted successfully'
            this.logger.error(`Failed to connect: ${e}]`)
          })

        return response
      })
      .catch((error) => {
        response.message = `Material requisition failed to delete : ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error

        return response
      })
  }

  async askApproval(
    data: MaterialRequisitionApproval,
    id: string,
    account: IAccount,
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
      transaction_classify: 'MATERIAL_REQUISITION_ASK_APPROVAL',
      transaction_id: null,
    } satisfies GlobalResponse

    const status: IMaterialRequisitionApproval = {
      status: 'need_approval',
      remark: data.remark,
      logged_at: new TimeManagement().getTimezone(
        this.configService.get<string>('application.timezone')
      ),
      created_by: account,
    }

    return await this.materialRequisitionModel
      .findOneAndUpdate(
        { id: id, 'created_by.id': account.id, status: 'new', __v: data.__v },
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
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result._id
        response.payload = result

        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: `${token}`,
            },
          })
          .then(async (clientSet: Socket) => {
            response.message =
              'Material requisition proposed and notified successfully'

            clientSet.emit('proceed', {
              sender: account,
              receiver: null,
              payload: response,
            } satisfies ProceedDataTrafficDTO)
          })
          .catch((e: Error) => {
            response.message = 'Material requisition proposed successfully'
            this.logger.error(`Failed to connect: ${e}]`)
          })

        return response
      })
      .catch((error) => {
        response.message = `Material requisition failed to proposed : ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error

        return response
      })
  }

  async approve(
    data: MaterialRequisitionApproval,
    id: string,
    account: IAccount,
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
      transaction_classify: 'MATERIAL_REQUISITION_APPROVE',
      transaction_id: null,
    } satisfies GlobalResponse

    const status: IMaterialRequisitionApproval = {
      status: 'approved',
      remark: data.remark,
      logged_at: new TimeManagement().getTimezone(
        this.configService.get<string>('application.timezone')
      ),
      created_by: account,
    }

    return await this.materialRequisitionModel
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
            approval_history: status,
          },
        }
      )
      .then(async (result) => {
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result._id
        response.payload = result

        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: `${token}`,
            },
          })
          .then(async (clientSet: Socket) => {
            response.message =
              'Material requisition approved and notified successfully'

            clientSet.emit('proceed', {
              sender: account,
              receiver: null,
              payload: response,
            } satisfies ProceedDataTrafficDTO)
          })
          .catch((e: Error) => {
            response.message = 'Material requisition approved successfully'
            this.logger.error(`Failed to connect: ${e}]`)
          })

        return response
      })
      .catch((error) => {
        response.message = `Material requisition failed to approved : ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error

        return response
      })
  }

  async decline(
    data: MaterialRequisitionApproval,
    id: string,
    account: IAccount,
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
      transaction_classify: 'MATERIAL_REQUISITION_DECLINE',
      transaction_id: null,
    } satisfies GlobalResponse

    const status: IMaterialRequisitionApproval = {
      status: 'declined',
      remark: data.remark,
      logged_at: new TimeManagement().getTimezone(
        this.configService.get<string>('application.timezone')
      ),
      created_by: account,
    }

    return await this.materialRequisitionModel
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
            approval_history: status,
          },
        }
      )
      .then(async (result) => {
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result._id
        response.payload = result

        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: `${token}`,
            },
          })
          .then(async (clientSet: Socket) => {
            response.message =
              'Material requisition declined and notified successfully'

            clientSet.emit('proceed', {
              sender: account,
              receiver: null,
              payload: response,
            } satisfies ProceedDataTrafficDTO)
          })
          .catch((e: Error) => {
            response.message = 'Material requisition declined successfully'
            this.logger.error(`Failed to connect: ${e}]`)
          })

        return response
      })
      .catch((error) => {
        response.message = `Material requisition failed to declined : ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error

        return response
      })
  }
}
