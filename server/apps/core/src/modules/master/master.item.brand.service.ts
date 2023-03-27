import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemBrandAddDTO,
  MasterItemBrandEditDTO,
} from '@core/master/dto/master.item.brand'
import {
  MasterItemBrand,
  MasterItemBrandDocument,
} from '@core/master/schemas/master.item.brand'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model, Types } from 'mongoose'

@Injectable()
export class MasterItemBrandService {
  constructor(
    @InjectModel(MasterItemBrand.name)
    private masterItemBrandModel: Model<MasterItemBrandDocument>
  ) {}

  async data_prime(parameter: any) {
    return await prime_datatable(parameter, this.masterItemBrandModel)
  }

  async add(
    data: MasterItemBrandAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Master item brand failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async edit(
    parameter: MasterItemBrandEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_BRAND_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.masterItemBrandModel
      .findOneAndUpdate(
        {
          id: id,
          __v: parameter.__v,
        },
        {
          code: parameter.code,
          name: parameter.name,
          remark: parameter.remark,
        }
      )
      .then((result) => {
        if (result) {
          response.message = 'Master item brand updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Master item brand failed to update. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Master item brand failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
      })
    return response
  }

  async delete(_id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_BRAND_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.masterItemBrandModel.findOne({
      _id: new Types.ObjectId(_id),
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Master item brand deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Master item brand failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Master item brand failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }
}
