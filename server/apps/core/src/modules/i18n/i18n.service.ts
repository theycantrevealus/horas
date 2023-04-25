import { Account } from '@core/account/schemas/account.model'
import { i18nAddDTO, i18nEditDTO } from '@core/i18n/dto/i18n'
import { i18n, i18nDocument } from '@core/i18n/schemas/i18n'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class i18nService {
  constructor(
    @InjectModel(i18n.name) private readonly i18nModel: Model<i18nDocument>
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.i18nModel)
  }

  async noFilter() {
    return await this.i18nModel.find().exec()
  }

  async detail(id: string): Promise<i18n> {
    return this.i18nModel.findOne({ id: id }).exec()
  }

  async find(term: any) {
    return this.i18nModel.findOne(term).exec()
  }

  async add(data: i18nAddDTO, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result._id
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `i18n failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async edit(data: i18nEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `i18n failed to update. Invalid document`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `i18n failed to update. ${error.message}`
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
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `i18n failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `i18n failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }
}