import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@gateway_core/master/dto/master.item.supplier'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@schemas/master/master.item.supplier'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemSupplierService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterItemSupplier.name, 'primary')
    private masterItemSupplierModel: Model<MasterItemSupplierDocument>
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        parameter,
        this.masterItemSupplierModel
      ).catch((error: Error) => {
        throw error
      })
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return this.masterItemSupplierModel
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

  async add(data: MasterItemSupplierAddDTO, account: IAccount) {
    return await this.masterItemSupplierModel
      .create({
        ...data,
        created_by: account,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(data: MasterItemSupplierEditDTO, id: string) {
    return await this.masterItemSupplierModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          $set: {
            code: data.code,
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
            remark: data.remark,
            sales_name: data.sales_name,
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
    return await this.masterItemSupplierModel
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
