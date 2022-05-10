import { HttpCode, HttpStatus, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AccountModel } from '../model/account.model'
import { AccountAuthorityModel } from '../model/account.authority.model'

import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AccountLoginDTO, AccountLoginResponseDTO } from './dto/account'
import { AccountAddDTO, AccountAddDTOResponse } from './dto/account.add.dto'

import { AccountAuthorityAddDTO, AccountAuthorityAddDTOResponse } from './dto/account.authority.add.dto'
import { AuthService } from '../auth/auth.service'
import { filterSetDT } from '../mod.lib'
import { Http } from '@sentry/node/dist/integrations'
import { AccountAuthorityDeleteDTOResponse } from './dto/account.authority.delete.dto'
import { AccountEditDTO, AccountEditDTOResponse } from './dto/account.edit.dto'
import { AccountAuthorityEditDTO, AccountAuthorityEditDTOResponse } from './dto/account.authority.edit.dto'

@Injectable()
export class AuthorityService {
  constructor(
    @InjectRepository(AccountModel)
    private readonly accountRepo: Repository<AccountModel>,

    @InjectRepository(AccountAuthorityModel)
    private readonly accountAuthorityRepo: Repository<AccountAuthorityModel>,

    private readonly authService: AuthService
  ) { }

  async detail (uid: string) {
    return await this.accountAuthorityRepo.findOne({
      where: {
        uid: uid
      }
    })
  }

  async edit (data, uid: string) {
    let response = new AccountAuthorityEditDTOResponse()
    const authRes = this.accountAuthorityRepo.update(uid, data).then(async returning => {
      return await this.detail(uid)
    })
    if (authRes) {
      response.message = 'Authority updated succesfully'
      response.status = HttpStatus.OK
      response.returning = await authRes
    } else {
      response.message = 'Authority failed to add'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async delete_soft (uid: string) {
    let response = new AccountAuthorityDeleteDTOResponse()
    const oldMeta = await this.detail(uid)
    const authRes = this.accountAuthorityRepo.softDelete(uid)
    if (authRes) {
      response.message = 'Authority deleted successfully'
      response.status = HttpStatus.OK
      response.returning = oldMeta
    } else {
      response.message = 'Authority failed to delete'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async delete_hard (uid: string) {
    let response = new AccountAuthorityDeleteDTOResponse()
    const oldMeta = await this.detail(uid)
    const authRes = this.accountAuthorityRepo.delete(uid)
    if (authRes) {
      response.message = 'Authority deleted successfully'
      response.status = HttpStatus.OK
      response.returning = oldMeta
    } else {
      response.message = 'Authority failed to delete'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async all () {
    return await this.accountAuthorityRepo.find()
  }

  async paginate (param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = await this.accountAuthorityRepo.createQueryBuilder('account_authority')

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(param.filter[b].matchMode, param.filter[b].value)
        rawTotalRecords.andWhere(`account_authority.${b} ${filterSet.protocol} :a`, { a: filterSet.res })
      }
    }

    const totalRecords = await rawTotalRecords.getMany();


    const dataRaw = this.accountAuthorityRepo.createQueryBuilder('account_authority')
      // .innerJoinAndSelect('account.authority', 'authority')
      .skip(param.first)
      .take(param.rows)
      .where('account_authority.deleted_at IS NULL')


    if (param.sortField && param.sortField !== '') {
      dataRaw.orderBy(`account_authority.${param.sortField}`, ((param.sortOrder > 0) ? 'ASC' : 'DESC'))
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(param.filter[b].matchMode, param.filter[b].value)
        dataRaw.andWhere(`account_authority.${b} ${filterSet.protocol} :a`, { a: filterSet.res })
      }
    }

    const data = await dataRaw.getMany()

    let autonum = parseInt(skip) + 1

    for (const a in data) {

      if (data[a]) {
        dataResult.push({
          autonum: autonum,
          uid: data[a].uid,
          name: data[a].name,
          created_at: data[a].created_at
        })
        autonum++
      }
    }

    return {
      list: dataResult,
      totalRecords: totalRecords.length
    }
  }

  async add (data: AccountAuthorityAddDTO) {
    let response = new AccountAuthorityAddDTOResponse()
    const authRes = this.accountAuthorityRepo.save(data).then(returning => {
      return this.detail(returning.uid)
    })

    if (authRes) {
      response.message = 'Authority added succesfully'
      response.status = HttpStatus.OK
      response.returning = await authRes
    } else {
      response.message = 'Authority failed to add'
      response.status = HttpStatus.BAD_REQUEST
    }

    return response
  }
}
