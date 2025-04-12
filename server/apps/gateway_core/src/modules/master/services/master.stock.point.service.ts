import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterStockPointAddDTO,
  MasterStockPointEditDTO,
} from '@gateway_core/master/dto/master.stock.point'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@schemas/master/master.stock.point'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterStockPointService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterStockPoint.name, 'primary')
    private masterStockPointModel: Model<MasterStockPointDocument>
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.masterStockPointModel).catch(
        (error: Error) => {
          throw error
        }
      )
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.masterStockPointModel
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

  async find(term: any) {
    return await this.masterStockPointModel
      .findOne(term)
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

  async add(data: MasterStockPointAddDTO, account: IAccount) {
    return await this.masterStockPointModel
      .create({
        ...data,
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: MasterStockPointEditDTO, id: string) {
    return await this.masterStockPointModel
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
    return await this.masterStockPointModel
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
