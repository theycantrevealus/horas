import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@gateway_core/master/dto/master.item.category'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import {
  MasterItemCategory,
  MasterItemCategoryDocument,
} from '@schemas/master/master.item.category'
import { IMasterItemCategory } from '@schemas/master/master.item.category.interface'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemCategoryService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterItemCategory.name, 'primary')
    private masterItemCategoryModel: Model<MasterItemCategoryDocument>
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        parameter,
        this.masterItemCategoryModel
      ).catch((error: Error) => {
        throw error
      })
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.masterItemCategoryModel
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
    return await this.masterItemCategoryModel
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

  async upsert(term: any, account: Account) {
    const targetUnit = await this.find({ name: term.name })
    await this.add(
      {
        code: '',
        name: term.name,
        remark: '',
      },
      account
    ).then((result) => {
      targetUnit.id = result.id
      targetUnit.code = ''
      targetUnit.name = term.name
    })
    return targetUnit as IMasterItemCategory
  }

  async add(data: MasterItemCategoryAddDTO, account: IAccount) {
    return await this.masterItemCategoryModel
      .create({
        ...data,
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: MasterItemCategoryEditDTO, id: string) {
    return await this.masterItemCategoryModel
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
    return await this.masterItemCategoryModel
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
