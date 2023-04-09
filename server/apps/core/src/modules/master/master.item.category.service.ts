import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@core/master/dto/master.item.category'
import {
  MasterItemCategory,
  MasterItemCategoryDocument,
} from '@core/master/schemas/master.item.category'
import { IMasterItemCategory } from '@core/master/schemas/master.item.category.join'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemCategoryService {
  constructor(
    @InjectModel(MasterItemCategory.name)
    private masterItemCategoryModel: Model<MasterItemCategoryDocument>
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.masterItemCategoryModel)
  }

  async detail(id: string): Promise<MasterItemCategory> {
    return this.masterItemCategoryModel.findOne({ id: id }).exec()
  }

  async find(term: any): Promise<MasterItemCategory> {
    return this.masterItemCategoryModel.findOne(term).exec()
  }

  async upsert(term: any, account: Account): Promise<IMasterItemCategory> {
    let targetUnit: IMasterItemCategory = await this.find({ name: term.name })
    if (!targetUnit) {
      await this.add(
        {
          code: '',
          name: term.name,
          remark: '',
        },
        account
      ).then((result) => {
        targetUnit = {
          id: result.transaction_id.toString(),
          code: '',
          name: term.name,
        }
      })
    }
    return targetUnit
  }

  async add(
    data: MasterItemCategoryAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_CATEGORY_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    if (!data.code) {
      data.code = `${modCodes[this.constructor.name]}-${new Date().getTime()}`
    }

    await this.masterItemCategoryModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'Master item category created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result.id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Master item category failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async edit(
    data: MasterItemCategoryEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_CATEGORY_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.masterItemCategoryModel
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
          response.message = 'Master item category updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Master item category failed to update. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Master item category failed to update. ${error.message}`
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
      transaction_classify: 'MASTER_ITEM_CATEGORY_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.masterItemCategoryModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Master item category deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Master item category failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Master item category failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }
}
