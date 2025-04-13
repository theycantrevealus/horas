import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@gateway_core/account/dto/authority.dto'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Authority, AuthorityDocument } from '@schemas/account/authority.model'
import { PrimeParameter } from '@utility/dto/prime'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class AuthorityService {
  constructor(
    @InjectModel(Authority.name, 'primary')
    private accountAuthority: Model<AuthorityDocument>,

    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.accountAuthority).catch(
        (error: Error) => {
          throw error
        }
      )
    } catch (error) {
      throw error
    }
  }

  async detail(id: string) {
    return await this.accountAuthority
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

  async add(data: AuthorityAddDTO, credential: IAccount) {
    return await this.accountAuthority
      .create({
        ...data,
        created_by: credential,
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async edit(parameter: AuthorityEditDTO, id: string) {
    return await this.accountAuthority
      .findOneAndUpdate(
        {
          id: id,
          __v: parameter.__v,
        },
        {
          $set: {
            code: parameter.code,
            name: parameter.name,
            remark: parameter.remark,
          },
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

  async delete(id: string) {
    return await this.accountAuthority
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
