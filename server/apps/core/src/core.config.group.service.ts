import { Account } from '@core/account/schemas/account.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
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
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Config group failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async edit(id: string, data: ConfigGroupEditDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
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
          response.payload = result
        } else {
          response.message = `Config group failed to update. Invalid document`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Config group failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
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
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Config group failed to delete. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
    return response
  }
}
