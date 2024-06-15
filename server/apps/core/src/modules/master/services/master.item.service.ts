import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import {
  MasterItem,
  MasterItemDocument,
} from '@core/master/schemas/master.item'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemService {
  constructor(
    @InjectModel(MasterItem.name)
    private masterItemModel: Model<MasterItemDocument>
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
      transaction_classify: 'MASTER_ITEM_LIST',
      transaction_id: null,
    } satisfies GlobalResponse
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await prime_datatable(parsedData, this.masterItemModel).then(
        (result) => {
          response.payload = result.payload
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
      transaction_classify: 'MASTER_ITEM_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterItemModel.findOne({ id: id }).then((result) => {
        response.payload = result
        response.message = 'Master item detail fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Master item detail failed to fetch`
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
      transaction_classify: 'MASTER_ITEM_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterItemModel.findOne(term).then((result) => {
        response.payload = result
        response.message = 'Master item detail fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Master item detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async bulk(bulkData = []) {
    if (bulkData.length > 0) {
      const prepareBulk = await Promise.all(
        bulkData.map(async (data) => {
          let prepareData = await this.find({
            $and: [{ code: data.code }],
          }).then((r) => r)['payload']
          if (!prepareData) {
            prepareData = new this.masterItemModel({
              code: data.code,
              name: data.name,
              alias: data.alias,
              unit: data.unit,
              category: data.category,
              configuration: data.configuration,
              brand: data.brand,
              storing: data.storing,
              remark: data.remark,
              properties: data.properties,
            })
          } else {
            prepareData.name = data.name
            prepareData.alias = data.alias
            prepareData.unit = data.unit
            prepareData.category = data.category
            // prepareData.configuration = data.configuration
            prepareData.brand = data.brand
            // prepareData.storing = data.storing
            prepareData.remark = data.remark
            prepareData.properties = data.properties
          }
          return prepareData
        })
      )
      await this.masterItemModel
        .bulkSave(prepareBulk, { ordered: false })
        .then(() => {
          //
        })
        .catch((e: Error) => {
          throw e
        })
    }
  }

  async add(data: MasterItemAddDTO, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    if (!data.code) {
      data.code = `${modCodes[this.constructor.name]}-${new Date().getTime()}`
    }

    try {
      return await this.masterItemModel
        .create({
          ...data,
          created_by: account,
        })
        .then((result) => {
          response.message = 'Master item created successfully'
          response.transaction_id = result._id
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master item failed to create`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(data: MasterItemEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterItemModel
        .findOneAndUpdate(
          {
            id: id,
            __v: data.__v,
          },
          {
            code: data.code,
            name: data.name,
            brand: data.brand,
            category: data.category,
            unit: data.unit,
            properties: data.properties,
            remark: data.remark,
          }
        )
        .then((result) => {
          response.message = 'Master item updated successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master item failed to update`
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
      transaction_classify: 'MASTER_ITEM_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterItemModel
        .findOneAndUpdate(
          {
            id: id,
          },
          {
            deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
          }
        )
        .then(async () => {
          response.message = 'Master item deleted successfully'
          return response
        })
    } catch (error) {
      response.message = 'Master item failed to delete'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async import(file: string, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_IMPORT',
      transaction_id: null,
    } satisfies GlobalResponse

    // const emitter = await this.mItemClient.send({
    //   topic: 'master_item',
    //   messages: [
    //     {
    //       headers: {},
    //       key: {},
    //       value: {
    //         file: file,
    //         account: account,
    //       },
    //     },
    //   ],
    // })
    const emitter = true
    if (emitter) {
      response.message = 'Master item imported successfully'
    } else {
      response.message = `Master item failed to import`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
