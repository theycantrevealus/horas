import { i18nAddDTO, i18nEditDTO } from '@gateway_core/i18n/dto/i18n'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { i18n, i18nDocument } from '@schemas/i18n/i18n'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class I18nService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(i18n.name, 'primary')
    private readonly i18nModel: Model<i18nDocument>
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.i18nModel).catch(
        (error: Error) => {
          throw error
        }
      )
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.i18nModel
      .findOne({ id: id })
      .then((result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async add(data: i18nAddDTO, account: Account) {
    return await this.i18nModel
      .create({
        ...data,
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: i18nEditDTO, id: string) {
    return await this.i18nModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          $set: {
            language_code: data.language_code,
            iso_2_digits: data.iso_2_digits,
            iso_3_digits: data.iso_3_digits,
            name: data.name,
            datetime: data.datetime,
            number: data.number,
            components: data.components,
            remark: data.remark,
          },
        },
        { upsert: false, new: false }
      )
      .then((result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async delete(id: string) {
    return await this.i18nModel
      .findOneAndUpdate(
        {
          id: id,
        },
        {
          deleted_at: new TimeManagement().getTimezone(
            this.configService.get<string>('application.timezone')
          ),
        }
      )
      .then((result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }
}
