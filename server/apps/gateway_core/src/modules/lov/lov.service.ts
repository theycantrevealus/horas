import { LOVAddDTO, LOVEditDTO } from '@gateway_core/lov/dto/lov'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { LOV, LOVDocument } from '@schemas/lov/lov'
import { ILOV } from '@schemas/lov/lov.interface'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class LOVService {
  constructor(
    @InjectModel(LOV.name, 'primary') private lovModel: Model<LOVDocument>
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.lovModel)
  }

  async detail(id: string): Promise<LOV> {
    return this.lovModel.findOne({ id: id }).exec()
  }

  async find(term: any): Promise<LOV> {
    return this.lovModel.findOne(term).exec()
  }

  async upsert(term: any, account: Account): Promise<ILOV> {
    let target: ILOV = await this.find({ name: term.name })
    if (!target) {
      await this.add(
        {
          group: term.group,
          name: term.name,
          parent: term.parent,
          remark: term.remark,
        },
        account
      ).then((result) => {
        target = {
          id: `lov-${result.transaction_id.toString()}`,
          name: term.name,
          value: term.value,
        }
      })
    }
    return target
  }

  async add(data: LOVAddDTO, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'LOV_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.lovModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'LOV created successfully'
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `LOV failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async edit(data: LOVEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'LOV_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.lovModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          group: data.group,
          name: data.name,
          parent: data.parent,
          remark: data.remark,
        }
      )
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'LOV updated successfully'
          response.payload = result
        } else {
          response.message = `LOV failed to update. Invalid document`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `LOV failed to update. ${error.message}`
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
    const data = await this.lovModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'LOV deleted successfully'
          response.payload = result
        })
        .catch((error: Error) => {
          response.message = `LOV failed to delete. ${error.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `LOV failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
