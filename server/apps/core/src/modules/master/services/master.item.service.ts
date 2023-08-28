import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import {
  MasterItem,
  MasterItemDocument,
} from '@core/master/schemas/master.item'
import { Inject, Injectable } from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { M_ITEM_SERVICE } from '@utility/constants'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemService {
  constructor(
    @InjectModel(MasterItem.name)
    private masterItemModel: Model<MasterItemDocument>,

    @Inject(M_ITEM_SERVICE) private readonly mItemClient: ClientKafka
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.masterItemModel)
  }

  async filter(search: string, limit: number): Promise<MasterItem[]> {
    return await this.masterItemModel
      .find({
        $or: [
          { code: new RegExp(search, 'i') },
          { name: new RegExp(search, 'i') },
          { alias: new RegExp(search, 'i') },
        ],
      })
      .limit(limit)
      .exec()
  }

  async detail(id: string): Promise<MasterItem> {
    return this.masterItemModel.findOne({ id: id }).exec()
  }

  async find(term: any) {
    return this.masterItemModel.findOne(term).exec()
  }

  async bulk(bulkData = []) {
    if (bulkData.length > 0) {
      const prepareBulk = await Promise.all(
        bulkData.map(async (data) => {
          let prepareData = await this.find({
            $and: [{ code: data.code }],
          })
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
          //
        })
    }
  }

  async add(data: MasterItemAddDTO, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    if (!data.code) {
      data.code = `${modCodes[this.constructor.name]}-${new Date().getTime()}`
    }

    await this.masterItemModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'Master item created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Master item failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async edit(data: MasterItemEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.masterItemModel
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
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'Master item updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Master item failed to update. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Master item failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
      })
    return response
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.masterItemModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then(() => {
          response.message = 'Master item deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Master item failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Master item failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }

  async import(file: string, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_IMPORT',
      transaction_id: null,
    } satisfies GlobalResponse
    const emitter = await this.mItemClient.emit('master_item', {
      file: file,
      account: account,
    })
    if (emitter) {
      response.message = 'Master item imported successfully'
      response.statusCode = `${modCodes[this.constructor.name]}_G_${
        modCodes.Global.success
      }`
    } else {
      response.message = `Master item failed to import`
      response.statusCode = `${modCodes[this.constructor.name]}_G_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }
}
