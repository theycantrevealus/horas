import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterQueueMachineAddDTO,
  MasterQueueMachineEditDTO,
} from '@gateway_core/master/dto/master.queue.machine'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterQueueMachine,
  MasterQueueMachineDocument,
} from '@schemas/master/master.queue.machine'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterQueueMachineService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterQueueMachine.name, 'primary')
    private masterQueueMachineModel: Model<MasterQueueMachineDocument>
  ) {}

  async all(payload: any) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_QUEUE_MACHINE_LIST',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        parameter,
        this.masterQueueMachineModel
      ).then((result) => {
        response.payload = result.payload
        response.message = 'Master queue fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Master queue failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async detail(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_QUEUE_MACHINE_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueMachineModel
        .findOne({ id: id })
        .then((result) => {
          response.payload = result
          response.message = 'Master queue detail fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Master queue detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MasterQueueMachineAddDTO,
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
      transaction_classify: 'MASTER_QUEUE_MACHINE_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueMachineModel
        .create({
          ...data,
          created_by: account,
        })
        .then((result) => {
          response.message = 'Master queue created successfully'
          response.transaction_id = result._id
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master queue failed to create`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterQueueMachineEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_QUEUE_MACHINE_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueMachineModel
        .findOneAndUpdate(
          {
            id: id,
            __v: data.__v,
          },
          {
            code: data.code,
            remark: data.remark,
          }
        )
        .then((result) => {
          response.message = 'Master queue updated successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master queue failed to update`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_QUEUE_MACHINE_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueMachineModel
        .findOneAndUpdate(
          {
            id: id,
          },
          {
            deleted_at: new TimeManagement().getTimezone(
              await this.configService.get<string>('application.timezone')
            ),
          }
        )
        .then(async () => {
          response.message = 'Master queue deleted successfully'
          return response
        })
    } catch (error) {
      response.message = 'Master queue failed to delete'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
