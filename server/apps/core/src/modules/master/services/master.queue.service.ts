import { Account } from '@core/account/schemas/account.model'
import {
  MasterQueueAddDTO,
  MasterQueueEditDTO,
} from '@core/master/dto/master.queue'
import { MasterQueue } from '@core/master/schemas/master.queue.machine'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { Model } from 'mongoose'

@Injectable()
export class MasterQueueService {
  constructor(
    @InjectModel(MasterQueue.name)
    private masterQueueModel: Model<MasterQueue>
  ) {}

  async all(parameter: any) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_QUEUE_LIST',
      transaction_id: null,
    } satisfies GlobalResponse
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await prime_datatable(parsedData, this.masterQueueModel).then(
        (result) => {
          response.payload = result.payload.data
          response.message = 'Data query success'
          return response
        }
      )
    } else {
      response.statusCode = {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: modCodes.Global.failed,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.message = 'filters is not a valid json'
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
      transaction_classify: 'MASTER_QUEUE_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueModel.findOne({ id: id }).then((result) => {
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
    data: MasterQueueAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_QUEUE_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueModel
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

  async edit(data: MasterQueueEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_QUEUE_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueModel
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
      transaction_classify: 'MASTER_QUEUE_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterQueueModel
        .findOneAndUpdate(
          {
            id: id,
          },
          {
            deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
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
