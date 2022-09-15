import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MenuPermissionModel } from '../model/menu.permission.model'
import {
  MenuPermissionAddDTO,
  MenuPermissionAddResponseDTO,
} from './dto/menu.permission.add.dto'
import { MenuPermissionDeleteResponseDTO } from './dto/menu.permission.delete.dto'
import {
  MenuPermissionEditDTO,
  MenuPermissionEditResponseDTO,
} from './dto/menu.permission.edit.dto'

@Injectable()
export class MenuPermissionService {
  constructor(
    @InjectRepository(MenuPermissionModel)
    private readonly menuPermissionRepo: Repository<MenuPermissionModel>,
  ) {}

  async add(data: MenuPermissionAddDTO) {
    const menuResp = new MenuPermissionAddResponseDTO()
    const menuRes = await this.menuPermissionRepo
      .save(data)
      .then(async (returning) => {
        return await this.detail(returning.id)
      })

    if (menuRes) {
      menuResp.message = 'Menu Permission Added Successfully'
      menuResp.status = HttpStatus.OK
      menuResp.returning = menuRes
    } else {
      menuResp.message = 'Menu Permission Added Failed'
      menuResp.status = HttpStatus.BAD_REQUEST
    }

    return menuResp
  }

  async edit(data: MenuPermissionEditDTO, id: number) {
    const menuResp = new MenuPermissionEditResponseDTO()
    const menuRes = await this.menuPermissionRepo
      .update(id, data)
      .then(async (returning) => {
        return await this.detail(id)
      })
    if (menuRes) {
      menuResp.message = 'Menu Permission Updated Successfully'
      menuResp.status = HttpStatus.OK
      menuResp.returning = menuRes
    } else {
      menuResp.message = 'Menu Permission Updated Failed'
      menuResp.status = HttpStatus.BAD_REQUEST
    }

    return menuResp
  }

  async delete_hard(id: number) {
    const menuResp = new MenuPermissionDeleteResponseDTO()
    const oldData = await this.detail(id)
    const menuRes = await this.menuPermissionRepo.delete({ id })
    if (menuRes) {
      menuResp.message = 'Menu Permission Deleted Successfully'
      menuResp.status = HttpStatus.OK
      menuResp.returning = oldData
    } else {
      menuResp.message = 'Menu Permission Deleted Failed'
      menuResp.status = HttpStatus.BAD_REQUEST
    }

    return menuResp
  }

  async delete_soft(id: number) {
    const menuResp = new MenuPermissionDeleteResponseDTO()
    const oldData = await this.detail(id)
    const menuRes = await this.menuPermissionRepo.softDelete({ id })
    if (menuRes) {
      menuResp.message = 'Menu Permission Deleted Successfully'
      menuResp.status = HttpStatus.OK
      menuResp.returning = oldData
    } else {
      menuResp.message = 'Menu Permission Deleted Failed'
      menuResp.status = HttpStatus.BAD_REQUEST
    }

    return menuResp
  }

  async detail(id: number) {
    return await this.menuPermissionRepo.findOne({ where: { id: id } })
  }

  async menu_permission(id: number) {
    return this.menuPermissionRepo
      .createQueryBuilder(this.menuPermissionRepo.metadata.name)
      .where(`${this.menuPermissionRepo.metadata.name}.menu = :menu_id`, {
        menu_id: id,
      })
    //return await this.menuPermissionRepo.find({ where: { menu: id } })
  }

  async all() {
    return await this.menuPermissionRepo.find()
  }
}
