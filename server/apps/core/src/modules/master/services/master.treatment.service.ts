import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  MasterTreatmentAddDTO,
  MasterTreatmentEditDTO,
} from '@core/master/dto/master.treatment'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { MasterTreatment } from '@schemas/master/master.treatment'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterTreatmentService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterTreatment.name, 'primary')
    private readonly masterTreatment: Model<MasterTreatment>
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
      transaction_classify: 'MASTER_TREATMENT_LIST',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.masterTreatment).then(
        (result) => {
          response.payload = result.payload
          response.message = 'Treatment fetch successfully'
          return response
        }
      )
    } catch (error) {
      response.message = `Treatment failed to fetch`
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
      transaction_classify: 'MASTER_TREATMENT_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterTreatment.findOne({ id: id }).then((result) => {
        response.payload = result ?? {}
        response.message = 'Treatment detail fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Treatment detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MasterTreatmentAddDTO,
    account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_TREATMENT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    data.code =
      data.code ?? `${modCodes[this.constructor.name]}-${new Date().getTime()}`

    try {
      return await this.masterTreatment
        .create({
          ...data,
          created_by: account,
        })
        .then(async (result) => {
          response.message = 'Treatment created successfully'
          response.transaction_id = result._id
          response.payload = {
            id: result.id,
            ...data,
          }
          return response
        })
    } catch (error) {
      response.message = 'Treatment failed to create'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterTreatmentEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.masterTreatment.findOne({
        id: id,
      }),
      transaction_classify: 'MASTER_TREATMENT_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterTreatment
        .findOneAndUpdate(
          {
            id: id,
            __v: data.__v,
          },
          {
            code: data.code,
            name: data.name,
            remark: data.remark,
          },
          { upsert: false, new: true }
        )
        .then((result) => {
          response.statusCode.customCode = !result
            ? modCodes[this.constructor.name].error.isNotFound.customCode
            : response.statusCode.customCode

          response.statusCode.defaultCode = !result
            ? modCodes[this.constructor.name].error.isNotFound.defaultCode
            : response.statusCode.defaultCode

          response.message = !result
            ? 'Treatment failed to update'
            : 'Treatment updated successfully'

          response.payload = result

          return response
        })
    } catch (error) {
      response.message = `Treatment failed to update. ${error.message}`
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
      payload: await this.masterTreatment.findOne({
        id: id,
      }),
      transaction_classify: 'MASTER_TREATMENT_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterTreatment
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
        .then(() => {
          response.message = 'Treatment deleted successfully'
          return response
        })
    } catch (error) {
      response.message = `Treatment failed to delete`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
