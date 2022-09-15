import { filterSetDT } from '@/mod.lib'
import { MenuGroupModel } from '@/model/menu.group.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  MenuGroupAddDTO,
  MenuGroupAddResponseDTO,
} from './dto/menu.group.add.dto'
import { MenuGroupDeleteDTOResponse } from './dto/menu.group.delete.dto'
import {
  MenuGroupEditDTO,
  MenuGroupEditResponseDTO,
} from './dto/menu.group.edit.dto'

@Injectable()
export class MenuGroupService {
  constructor(
    @InjectRepository(MenuGroupModel)
    private readonly menuGroupRepo: Repository<MenuGroupModel>,
  ) {}

  async add(data: MenuGroupAddDTO) {
    const menuGroupResp = new MenuGroupAddResponseDTO()
    const menuGroupRes = await this.menuGroupRepo
      .save(data)
      .then(async (returning) => {
        return await this.detail(returning.id)
      })
    if (menuGroupRes) {
      menuGroupResp.message = 'Menu Group Added Successfully'
      menuGroupResp.status = HttpStatus.OK
      menuGroupResp.returning = menuGroupRes
    } else {
      menuGroupResp.message = 'Menu Group Failed to Add'
      menuGroupResp.status = HttpStatus.BAD_REQUEST
    }

    return menuGroupResp
  }

  async edit(data: MenuGroupEditDTO, id: number) {
    const menuGroupResp = new MenuGroupEditResponseDTO()
    const menuGroupRes = await this.menuGroupRepo
      .update(id, data)
      .then(async (returning) => {
        return await this.detail(id)
      })
    if (menuGroupRes) {
      menuGroupResp.message = 'Menu Group Updated Successfully'
      menuGroupResp.status = HttpStatus.OK
      menuGroupResp.returning = menuGroupRes
    } else {
      menuGroupResp.message = 'Menu Group Failed to Update'
      menuGroupResp.status = HttpStatus.BAD_REQUEST
    }

    return menuGroupResp
  }

  async delete_hard(id: number) {
    const menuGroupResp = new MenuGroupDeleteDTOResponse()
    const oldMeta = await this.detail(id)
    const menuGroupRes = await this.menuGroupRepo.delete({ id })
    if (menuGroupRes) {
      menuGroupResp.message = 'Menu Group Deleted Successfully'
      menuGroupResp.status = HttpStatus.OK
      menuGroupResp.returning = oldMeta
    } else {
      menuGroupResp.message = 'Menu Group Failed to Delete'
      menuGroupResp.status = HttpStatus.BAD_REQUEST
    }

    return menuGroupResp
  }

  async delete_soft(id: number) {
    const menuGroupResp = new MenuGroupDeleteDTOResponse()
    const oldMeta = await this.detail(id)
    const menuGroupRes = await this.menuGroupRepo.softDelete({ id })
    if (menuGroupRes) {
      menuGroupResp.message = 'Menu Group Deleted Successfully'
      menuGroupResp.status = HttpStatus.OK
      menuGroupResp.returning = oldMeta
    } else {
      menuGroupResp.message = 'Menu Group Failed to Delete'
      menuGroupResp.status = HttpStatus.BAD_REQUEST
    }

    return menuGroupResp
  }

  async paginate(param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = await this.menuGroupRepo.createQueryBuilder(
      'menu_group',
    )

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value,
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
        param.sortOrder > 0 ? 'ASC' : 'DESC',
      )
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value,
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
