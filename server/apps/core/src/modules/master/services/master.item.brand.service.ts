import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemBrandAddDTO,
  MasterItemBrandEditDTO,
} from '@core/master/dto/master.item.brand'
import {
  MasterItemBrand,
  MasterItemBrandDocument,
} from '@core/master/schemas/master.item.brand'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemBrandService {
  constructor(
    @InjectModel(MasterItemBrand.name)
    private masterItemBrandModel: Model<MasterItemBrandDocument>
  ) {}

  async all(parameter: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_BRAND_LIST',
      transaction_id: null,
    } satisfies GlobalResponse
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await prime_datatable(parsedData, this.masterItemBrandModel).then(
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
    }
    return response
  }

  async detail(id: string): Promise<MasterItemBrand> {
    return this.masterItemBrandModel.findOne({ id: id }).exec()
  }

  async add(
    data: MasterItemBrandAddDTO,
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
      transaction_classify: 'MASTER_ITEM_BRAND_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    if (!data.code) {
      data.code = `${modCodes[this.constructor.name]}-${new Date().getTime()}`
    }

    await this.masterItemBrandModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'Master item brand created successfully'
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Master item brand failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
      })

    return response
  }

  async edit(
    data: MasterItemBrandEditDTO,
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
      transaction_classify: 'MASTER_ITEM_BRAND_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.masterItemBrandModel
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
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'Master item brand updated successfully'
          response.payload = result
        } else {
          response.message = `Master item brand failed to update. Invalid document`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Master item brand failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
      })
    return response
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
      transaction_classify: 'MASTER_ITEM_BRAND_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.masterItemBrandModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then(() => {
          response.message = 'Master item brand deleted successfully'
        })
        .catch((error: Error) => {
          response.message = `Master item brand failed to delete. ${error.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `Master item brand failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
