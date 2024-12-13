import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterReceptionistCounterAddDTO,
  MasterReceptionistCounterEditDTO,
} from '@gateway_core/master/dto/master.receptionist.counter'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterReceptionistCounter,
  MasterReceptionistCounterDocument,
} from '@schemas/master/master.receptionist.counter'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterReceptionistCounterService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterReceptionistCounter.name, 'primary')
    private readonly masterReceptionistCounter: Model<MasterReceptionistCounterDocument>
  ) {}

  async all(payload: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_LIST',
      transaction_id: null,
    } satisfies GlobalResponse
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        parameter,
        this.masterReceptionistCounter
      ).then((result) => {
        response.payload = result.payload
        response.message = 'Master receptionist counter fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Master receptionist counter failed to fetch`
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
      transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterReceptionistCounter
        .findOne({ id: id })
        .then((result) => {
          response.payload = result
          response.message =
            'Master receptionist counter detail fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Master receptionist counter detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MasterReceptionistCounterAddDTO,
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
      transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    data.code =
      data.code ?? `${modCodes[this.constructor.name]}-${new Date().getTime()}`

    try {
      return await this.masterReceptionistCounter
        .create({
          ...data,
          created_by: account,
        })
        .then((result) => {
          response.message = 'Master receptionist counter created successfully'
          response.transaction_id = result._id
          response.payload = {
            id: result.id,
            ...data,
          }
          return response
        })
    } catch (error) {
      response.message = `Master receptinist counter failed to create`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterReceptionistCounterEditDTO,
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
      transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterReceptionistCounter
        .findOneAndUpdate(
          {
            id: id,
            __v: data.__v,
          },
          {
            code: data.code,
            type: data.type,
            remark: data.remark,
          }
        )
        .then((result) => {
          response.message = 'Master receptionist counter updated successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master receptionist counter failed to update`
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
      transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterReceptionistCounter
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
          response.message = 'Master receptionist counter deleted successfully'
          return response
        })
    } catch (error) {
      response.message = 'Master receptionist counter failed to delete'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
