import { CoreMenuGroupModel } from '@/models/core.menu.group.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { filterSetDT } from '@/utilities/mod.lib'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { response } from 'express'
import { Repository } from 'typeorm'

@Injectable()
export class MenuGroupService {
  constructor(
    @InjectRepository(CoreMenuGroupModel)
    private readonly menuGroupRepo: Repository<CoreMenuGroupModel>
  ) {}

  async add(data: CoreMenuGroupModel): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.menuGroupRepo
      .save(data)
      .then(async (returning) => {
        response.message = 'Menu Group Added Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = await this.detail(returning.id)
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async edit(data: CoreMenuGroupModel, id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.menuGroupRepo
      .update(id, data)
      .then(async (returning) => {
        response.message = 'Menu Group Updated Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = await this.detail(id)
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async delete_hard(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return await this.menuGroupRepo
      .delete({ id })
      .then(async (returning) => {
        response.message = 'Menu Group Deleted Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldMeta
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async delete_soft(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return await this.menuGroupRepo
      .softDelete({ id })
      .then(async (returning) => {
        response.message = 'Menu Group Deleted Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldMeta
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async paginate(param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = await this.menuGroupRepo.createQueryBuilder(
      'menu_group'
    )

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

    const dataRaw = this.menuGroupRepo
      .createQueryBuilder('menu_group')
      .skip(param.first)
      .take(param.rows)
      .where('menu_group.deleted_at IS NULL')

    if (param.sortField && param.sortField !== '') {
      dataRaw.orderBy(
        `menu_group.${param.sortField}`,
        param.sortOrder > 0 ? 'ASC' : 'DESC'
      )
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value
        )
        dataRaw.andWhere(`menu_group.${b} ${filterSet.protocol} :a`, {
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
          uid: data[a].id,
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

  async all() {
    return await this.menuGroupRepo.find({ order: { id: 'ASC' } })
  }

  async detail(id: number) {
    return await this.menuGroupRepo.findOne({ where: { id: id } })
  }
}
