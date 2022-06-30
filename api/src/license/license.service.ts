import { HttpCode, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LicenseModel } from '../model/license.model'
import { Repository } from 'typeorm'
import { filterSetDT } from '../mod.lib'
import { LicenseAddDTO, LicenseAddDTOResponse } from './dto/license.add.dto'

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(LicenseModel)
    private readonly licenseRepo: Repository<LicenseModel>
  ) { }

  async all () { }

  async detail (uid: string) {
    let data = {
      account: {},
      access: [],
      permission: []
    }
    data.account = await this.licenseRepo.createQueryBuilder('license').innerJoinAndSelect('license.company', 'company').where('license.uid = :uid', { uid }).getOne()
    return data
  }

  async add (license: LicenseAddDTO) {
    let response = new LicenseAddDTOResponse()

    const licenseRes = this.licenseRepo.save(license).then(async returning => {
      return await this.detail(returning.uid)
    })
    if (licenseRes) {
      response.message = 'License added successfully'
      response.status = HttpStatus.OK
      response.returning = await licenseRes
    } else {
      response.message = 'License failed to add'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async paginate (param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = await this.licenseRepo.createQueryBuilder('license')

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(param.filter[b].matchMode, param.filter[b].value)
        rawTotalRecords.andWhere(`account.${b} ${filterSet.protocol} :a`, { a: filterSet.res })
      }
    }

    const totalRecords = await rawTotalRecords.getMany();


    const dataRaw = this.licenseRepo.createQueryBuilder('account')
      .skip(param.first)
      .take(param.rows)
      .where('account.deleted_at IS NULL')


    if (param.sortField && param.sortField !== '') {
      dataRaw.orderBy(`account.${param.sortField}`, ((param.sortOrder > 0) ? 'ASC' : 'DESC'))
    } else {
      dataRaw.orderBy('account.created_at', 'DESC')
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(param.filter[b].matchMode, param.filter[b].value)
        dataRaw.andWhere(`account.${b} ${filterSet.protocol} :a`, { a: filterSet.res })
      }
    }

    const data = await dataRaw.getMany()

    let autonum = parseInt(skip) + 1

    for (const a in data) {

      if (data[a]) {
        dataResult.push({
          autonum: autonum,
          uid: data[a].uid,
          email: data[a].email,
          first_name: data[a].first_name,
          last_name: data[a].last_name,
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
}