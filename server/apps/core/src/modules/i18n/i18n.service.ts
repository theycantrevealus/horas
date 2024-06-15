import { i18nAddDTO, i18nEditDTO } from '@core/i18n/dto/i18n'
import { i18n, i18nDocument } from '@core/i18n/schemas/i18n'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class i18nService {
  constructor(
    @InjectModel(i18n.name) private readonly i18nModel: Model<i18nDocument>
  ) {}

  async all(payload: any) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'I18N_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.i18nModel).then((result) => {
        response.payload = result.payload
        response.message = 'i18n fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `i18n failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async noFilter() {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.i18nModel.find().exec(),
      transaction_classify: 'I18N_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return response
    } catch (error) {
      response.message = `i18n failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async detail(id: string): Promise<i18n> {
    return this.i18nModel.findOne({ id: id }).exec()
  }

  async find(term: any) {
    return this.i18nModel.findOne(term).exec()
  }

  async add(data: i18nAddDTO, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'I18N_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.i18nModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'i18n created successfully'
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `i18n failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async edit(data: i18nEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'I18N_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.i18nModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          language_code: data.language_code,
          iso_2_digits: data.iso_2_digits,
          iso_3_digits: data.iso_3_digits,
          name: data.name,
          currency: data.currency,
          datetime_weekday: data.datetime_weekday,
          datetime_era: data.datetime_era,
          datetime_year: data.datetime_year,
          datetime_month: data.datetime_month,
          datetime_day: data.datetime_day,
          datetime_hour: data.datetime_hour,
          datetime_minute: data.datetime_minute,
          datetime_second: data.datetime_second,
          datetime_timezone_name: data.datetime_timezone_name,
          components: data.components,
          remark: data.remark,
        }
      )
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'i18n updated successfully'
          response.payload = result
        } else {
          response.message = `i18n failed to update. Invalid document`
          response.statusCode = {
            ...modCodes[this.constructor.name].error.databaseError,
            classCode: modCodes[this.constructor.name].defaultCode,
          }
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `i18n failed to update. ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
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
      transaction_classify: 'I18N_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.i18nModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'i18n deleted successfully'
          response.payload = result
        })
        .catch((error: Error) => {
          response.message = `i18n failed to delete. ${error.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `i18n failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
