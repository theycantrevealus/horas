import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  MasterStockPointAddDTO,
  MasterStockPointEditDTO,
} from '@core/master/dto/master.stock.point'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@schemas/master/master.stock.point'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterStockPointService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterStockPoint.name, 'primary')
    private masterStockPointModel: Model<MasterStockPointDocument>
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
      transaction_classify: 'MASTER_STOCK_POINT_LIST',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.masterStockPointModel).then(
        (result) => {
          response.payload = result.payload
          response.message = 'Master stock point fetch successfully'
          return response
        }
      )
    } catch (error) {
      response.message = `Master stock point failed to fetch`
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
      transaction_classify: 'MASTER_STOCK_POINT_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterStockPointModel
        .findOne({ id: id, deleted_at: null })
        .then((result) => {
          response.payload = result
          response.message = 'Master stock point detail fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Master stock point detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MasterStockPointAddDTO,
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
      transaction_classify: 'MASTER_STOCK_POINT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    if (!data.code) {
      data.code = `${modCodes[this.constructor.name]}-${new Date().getTime()}`
    }

    try {
      return await this.masterStockPointModel
        .create({
          ...data,
          created_by: account,
        })
        .then((result) => {
          response.message = 'Master stock point created successfully'
          response.transaction_id = result._id
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master stock point failed to create. ${error.message}`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterStockPointEditDTO,
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
      transaction_classify: 'MASTER_STOCK_POINT_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterStockPointModel
        .findOneAndUpdate(
          {
            id: id,
            __v: data.__v,
          },
          {
            code: data.code,
            name: data.name,
            remark: data.remark,
          }
        )
        .then((result) => {
          response.message = 'Master stock point updated successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master stock point failed to update. ${error.message}`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
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
      transaction_classify: 'MASTER_STOCK_POINT_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterStockPointModel
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
          response.message = 'Master stock model deleted successfully'
          return response
        })
    } catch (error) {
      response.message = 'Master stock model failed to delete'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
