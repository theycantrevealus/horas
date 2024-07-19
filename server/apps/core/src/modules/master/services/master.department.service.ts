import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  MasterDepartmentAddDTO,
  MasterDepartmentEditDTO,
} from '@core/master/dto/master.department'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterDepartment,
  MasterDepartmentDocument,
} from '@schemas/master/master.department'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model, Types } from 'mongoose'

@Injectable()
export class MasterDepartmentService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterDepartment.name, 'primary')
    private masterDepartmentModel: Model<MasterDepartmentDocument>
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
      transaction_classify: 'MASTER_DEPARTMENT_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.masterDepartmentModel).then(
        (result) => {
          response.payload = result.payload
          response.message = 'Department fetch successfully'
          return response
        }
      )
    } catch (error) {
      response.message = `Department failed to fetch`
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
      transaction_classify: 'MASTER_DEPARTMENT_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterDepartmentModel
        .findOne({ id: id })
        .then((result) => {
          response.payload = result ?? {}
          response.message = 'Department detail fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Department detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MasterDepartmentAddDTO,
    credential: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_DEPARTMENT_ADD',
      transaction_id: '',
    } satisfies GlobalResponse

    const generatedID = new Types.ObjectId().toString()
    try {
      return await this.masterDepartmentModel
        .create({
          ...data,
          id: generatedID,
          created_by: credential,
        })
        .then(async () => {
          response.message = 'Department created successfully'
          response.statusCode = {
            defaultCode: HttpStatus.OK,
            customCode: modCodes.Global.success,
            classCode: modCodes[this.constructor.name].defaultCode,
          }
          response.transaction_id = generatedID
          response.payload = {
            id: `account-${generatedID}`,
            ...data,
          }
          return response
        })
    } catch (error) {
      response.message = 'Department failed to create'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterDepartmentEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.masterDepartmentModel.findOne({
        id: id,
      }),
      transaction_classify: 'MASTER_DEPARTMENT_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterDepartmentModel
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
          if (!result) {
            response.statusCode = {
              ...modCodes[this.constructor.name].error.isNotFound,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.message = 'Department failed to update'
            response.payload = {}
            throw new Error(JSON.stringify(response))
          } else {
            response.message = 'Department updated successfully'
            response.payload = result
          }
          return response
        })
    } catch (error) {
      response.message = `Department failed to update. ${error.message}`
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
      payload: await this.masterDepartmentModel.findOne({
        id: id,
      }),
      transaction_classify: 'MASTER_DEPARTMENT_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterDepartmentModel
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
          response.message = 'Department deleted successfully'
          return response
        })
    } catch (error) {
      response.message = `Department failed to delete`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
