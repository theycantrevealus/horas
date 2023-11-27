import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@core/master/dto/master.item.category'
import { IMasterItemCategory } from '@core/master/interface/master.item.category'
import {
  MasterItemCategory,
  MasterItemCategoryDocument,
} from '@core/master/schemas/master.item.category'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemCategoryService {
  constructor(
    @InjectModel(MasterItemCategory.name)
    private masterItemCategoryModel: Model<MasterItemCategoryDocument>
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
      transaction_classify: 'MASTER_ITEM_CATEGORY_LIST',
      transaction_id: null,
    } satisfies GlobalResponse
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await prime_datatable(
        parsedData,
        this.masterItemCategoryModel
      ).then((result) => {
        response.payload = result.payload.data
        response.message = 'Data query success'
        return response
      })
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
      transaction_classify: 'MASTER_ITEM_CATEGORY_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterItemCategoryModel
        .findOne({ id: id })
        .then((result) => {
          response.payload = result
          response.message = 'Master item category detail fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Master item category detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async find(term: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_CATEGORY_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterItemCategoryModel.findOne(term).then((result) => {
        response.payload = result
        response.message = 'Master item category detail fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Master item category detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async upsert(term: any, account: Account): Promise<IMasterItemCategory> {
    const targetUnit: GlobalResponse = await this.find({ name: term.name })
    await this.add(
      {
        code: '',
        name: term.name,
        remark: '',
      },
      account
    ).then((result) => {
      targetUnit.payload = {
        id: result.transaction_id.toString(),
        code: '',
        name: term.name,
      }
    })
    return targetUnit.payload as IMasterItemCategory
  }

  async add(
    data: MasterItemCategoryAddDTO,
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
      transaction_classify: 'MASTER_ITEM_CATEGORY_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    if (!data.code) {
      data.code = `${modCodes[this.constructor.name]}-${new Date().getTime()}`
    }

    try {
      return await this.masterItemCategoryModel
        .create({
          ...data,
          created_by: account,
        })
        .then((result) => {
          response.message = 'Master item category created successfully'
          response.transaction_id = result.id
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master item category failed to create. ${error.message}`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterItemCategoryEditDTO,
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
      transaction_classify: 'MASTER_ITEM_CATEGORY_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterItemCategoryModel
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
          response.message = 'Master item category updated successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master item category failed to update. ${error.message}`
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
      transaction_classify: 'MASTER_ITEM_CATEGORY_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterItemCategoryModel
        .findOneAndUpdate(
          {
            id: id,
          },
          {
            deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
          }
        )
        .then(async () => {
          response.message = 'Master item category deleted successfully'
          return response
        })
    } catch (error) {
      response.message = 'Master item category failed to delete'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
