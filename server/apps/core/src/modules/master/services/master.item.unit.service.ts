import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemUnitAddDTO,
  MasterItemUnitEditDTO,
} from '@core/master/dto/master.item.unit'
import {
  MasterItemUnit,
  MasterItemUnitDocument,
} from '@core/master/schemas/master.item.unit'
import { IMasterItemUnit } from '@core/master/schemas/master.item.unit.join'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemUnitService {
  constructor(
    @InjectModel(MasterItemUnit.name)
    private masterItemUnitModel: Model<MasterItemUnitDocument>
  ) {}

  async all(parameter: any) {
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
      response.payload = await prime_datatable(
        parsedData,
        this.masterItemUnitModel
      )
      response.message = 'Data query success'
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

  async detail(id: string): Promise<MasterItemUnit> {
    return this.masterItemUnitModel.findOne({ id: id }).exec()
  }

  async find(term: any): Promise<MasterItemUnit> {
    return this.masterItemUnitModel.findOne(term).exec()
  }

  async upsert(term: any, account: Account): Promise<IMasterItemUnit> {
    let targetUnit: IMasterItemUnit = await this.find({ name: term.name })
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
          id: result.transaction_id,
          code: '',
          name: term.name,
        }
      })
    }
    return targetUnit
  }

  async add(
    data: MasterItemUnitAddDTO,
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
      transaction_classify: 'MASTER_ITEM_UNIT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    if (!data.code) {
      data.code = `${modCodes[this.constructor.name]}-${new Date().getTime()}`
    }

    await this.masterItemUnitModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result: IMasterItemUnit) => {
        response.message = 'Master item unit created successfully'
        response.transaction_id = result.id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Master item unit failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async edit(data: MasterItemUnitEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_UNIT_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.masterItemUnitModel
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
          response.message = 'Master item unit updated successfully'
          response.payload = result
        } else {
          response.message = `Master item unit failed to update. Invalid document`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Master item unit failed to update. ${error.message}`
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
      transaction_classify: 'MASTER_ITEM_UNIT_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.masterItemUnitModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Master item unit deleted successfully'
          response.payload = result
        })
        .catch((error: Error) => {
          response.message = `Master item unit failed to delete. ${error.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `Master item unit failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
