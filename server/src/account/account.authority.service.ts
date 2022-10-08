import { HttpStatus, Injectable } from '@nestjs/common'

import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuthService } from '../auth/auth.service'
import { filterSetDT } from '@utilities/mod.lib'
import { AccountModel } from '@/models/account.model'
import { AccountAuthorityModel } from '@/models/account.authority.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'

@Injectable()
export class AuthorityService {
  constructor(
    @InjectRepository(AccountModel)
    private readonly accountRepo: Repository<AccountModel>,

    @InjectRepository(AccountAuthorityModel)
    private readonly accountAuthorityRepo: Repository<AccountAuthorityModel>,

    private readonly authService: AuthService
  ) {}

  async detail(id: number) {
    return await this.accountAuthorityRepo.findOne({
      where: {
        id: id,
      },
    })
  }

  async edit(data, id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return this.accountAuthorityRepo
      .update(id, data)
      .then(async (returning) => {
        response.message = 'Authority updated succesfully'
        response.statusCode = HttpStatus.OK
        response.payload = await returning
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async delete_soft(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return this.accountAuthorityRepo
      .softDelete(id)
      .then(async (returning) => {
        response.message = 'Authority deleted successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldMeta
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async delete_hard(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return this.accountAuthorityRepo
      .delete(id)
      .then(async (returning) => {
        response.message = 'Authority deleted successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldMeta
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async all() {
    return await this.accountAuthorityRepo.find()
  }

  async paginate(param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = await this.accountAuthorityRepo.createQueryBuilder(
      'account_authority'
    )

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value
        )
        rawTotalRecords.andWhere(
          `account_authority.${b} ${filterSet.protocol} :a`,
          { a: filterSet.res }
        )
      }
    }

    const totalRecords = await rawTotalRecords.getMany()

    const dataRaw = this.accountAuthorityRepo
      .createQueryBuilder('account_authority')
      // .innerJoinAndSelect('account.authority', 'authority')
      .skip(param.first)
      .take(param.rows)
      .where('account_authority.deleted_at IS NULL')

    if (param.sortField && param.sortField !== '') {
      dataRaw.orderBy(
        `account_authority.${param.sortField}`,
        param.sortOrder > 0 ? 'ASC' : 'DESC'
      )
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value
        )
        dataRaw.andWhere(`account_authority.${b} ${filterSet.protocol} :a`, {
          a: filterSet.res,
        })
      }
    }

    const data = await dataRaw.getMany()

    let autonum = parseInt(skip) + 1

    for (const a in data) {
      if (data[a]) {
        dataResult.push({
          autonum: autonum,
          id: data[a].id,
          name: data[a].name,
          created_at: data[a].created_at,
        })
        autonum++
      }
    }

    return {
      list: dataResult,
      totalRecords: totalRecords.length,
    }
  }

  async add(data: AccountAuthorityModel): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return this.accountAuthorityRepo
      .save(data)
      .then((returning) => {
        response.message = 'Authority added succesfully'
        response.statusCode = HttpStatus.OK
        response.payload = returning
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }
}
