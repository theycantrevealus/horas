import { LOVAddDTO, LOVEditDTO } from '@gateway_core/lov/dto/lov'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { LOV, LOVDocument } from '@schemas/lov/lov'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class LOVService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectModel(LOV.name, 'primary') private lovModel: Model<LOVDocument>
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.lovModel).catch(
        (error: Error) => {
          throw error
        }
      )
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.lovModel
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

  async add(data: LOVAddDTO, account: Account) {
    return await this.lovModel
      .create({
        ...data,
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: LOVEditDTO, id: string) {
    return await this.lovModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          $set: {
            group: data.group,
            name: data.name,
            parent: data.parent,
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
    return await this.lovModel
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
