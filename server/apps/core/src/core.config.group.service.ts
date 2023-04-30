import { Account } from '@core/account/schemas/account.model'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { Model } from 'mongoose'

import { ConfigGroupAddDTO, ConfigGroupEditDTO } from './dto/config.group'
import { ConfigGroup, ConfigGroupDocument } from './schemas/config.group'

@Injectable()
export class CoreConfigGroupService {
  constructor(
    @InjectModel(ConfigGroup.name)
    private readonly configGroupModel: Model<ConfigGroupDocument>
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.configGroupModel)
  }

  async detail(id: string): Promise<ConfigGroup> {
    return this.configGroupModel.findOne({ id: id }).exec()
  }

  async add(
    data: ConfigGroupAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'CONFIG_GROUP_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.configGroupModel
      .create({
        ...data,
        created_by: account,
      })
      .then(async (result) => {
        response.message = 'Config group created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Config group failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async edit(id: string, data: ConfigGroupEditDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'CONFIG_GROUP_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.configGroupModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          name: data.name,
          label: data.label,
          icon: data.icon,
          parent: data.parent,
          remark: data.remark,
        }
      )
      .exec()
      .then(async (result) => {
        if (result) {
          response.message = 'Config group updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Config group failed to update. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Config group failed to update. ${error.message}`
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
      transaction_classify: 'LOV_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.configGroupModel
      .findOneAndDelete({
        id: id,
      })
      .exec()
      .then(async (result) => {
        response.message = 'Config group deleted successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_D_${
          modCodes.Global.success
        }`
      })
      .catch((error: Error) => {
        response.message = `Config group failed to delete. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_D_${
          modCodes.Global.failed
        }`
        response.payload = error
      })
    return response
  }
}
