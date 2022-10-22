import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { filterSetDT } from '@utilities/mod.lib'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { MasterItemModel } from '@/models/master.item.model'

@Injectable()
export class MasterItemService {
  constructor(
    @InjectRepository(MasterItemModel)
    private readonly masterItemRepo: Repository<MasterItemModel>,

    private dataSource: DataSource
  ) {}

  private logger = new Logger('HTTP')

  async detail(id: number) {
    return await this.dataSource
      .getRepository(MasterItemModel)
      .createQueryBuilder('master_item')
      .where('master_item.id = :id', { id })
      .getOne()
  }

  async delete_soft(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return await this.masterItemRepo
      .softDelete({ id })
      .then(async (returning) => {
        response.message = 'Item deleted successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldMeta
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async edit(data: MasterItemModel, id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.masterItemRepo
      .update(id, data)
      .then(async (returning) => {
        response.message = 'Item updated successfully'
        response.statusCode = HttpStatus.OK
        response.payload = await this.detail(id)
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async add(data: MasterItemModel): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.masterItemRepo.save(data).then(async (returning) => {
      response.message = 'Item added successfully'
      response.statusCode = HttpStatus.OK
      response.payload = await this.detail(returning.id)
      return response
    })
  }

  async all() {
    return await this.dataSource
      .getRepository(MasterItemModel)
      .createQueryBuilder('master_item')
      .getMany()
  }

  async paginate(param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = this.dataSource
      .getRepository(MasterItemModel)
      .createQueryBuilder('master_item')
      .where('deleted_at IS NULL')

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value
        )
        rawTotalRecords.andWhere(`account.${b} ${filterSet.protocol} :a`, {
          a: filterSet.res,
        })
      }
    }

    const totalRecords = await rawTotalRecords.getMany()

    const dataRaw = this.dataSource
      .getRepository(MasterItemModel)
      .createQueryBuilder('master_item')
      .skip(param.first)
      .take(param.rows)
      .where('master_item.deleted_at IS NULL')

    if (param.sortField && param.sortField !== '') {
      dataRaw.orderBy(
        `master_item.${param.sortField}`,
        param.sortOrder > 0 ? 'ASC' : 'DESC'
      )
    } else {
      dataRaw.orderBy('master_item.created_at', 'DESC')
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value
        )
        dataRaw.andWhere(`master_item.${b} ${filterSet.protocol} :a`, {
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
          brand: data[a].brand,
          remark: data[a].remark,
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
}
