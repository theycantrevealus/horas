import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemBrandAddDTO,
  MasterItemBrandEditDTO,
} from '@gateway_core/master/dto/master.item.brand'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterItemBrand,
  MasterItemBrandDocument,
} from '@schemas/master/master.item.brand'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemBrandService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterItemBrand.name, 'primary')
    private masterItemBrandModel: Model<MasterItemBrandDocument>
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.masterItemBrandModel).catch(
        (error: Error) => {
          throw error
        }
      )
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.masterItemBrandModel
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

  async add(data: MasterItemBrandAddDTO, account: IAccount) {
    return await this.masterItemBrandModel
      .create({
        ...data,
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: MasterItemBrandEditDTO, id: string) {
    return await this.masterItemBrandModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          $set: {
            code: data.code,
            name: data.name,
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
    return await this.masterItemBrandModel
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
