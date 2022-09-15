import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MenuModel } from '../model/menu.model'
import { Repository } from 'typeorm'
import { MenuAddDTO, MenuAddResponseDTO } from './dto/menu.add.dto'
import { AccountPrivilegesModel } from '../model/account.privileges.model'

import {
  GrantAccessDTO,
  GrantAccessResponseDTO,
} from './dto/menu.grant.privileges.dto'
import { MenuEditDTO, MenuEditResponseDTO } from './dto/menu.edit.dto'
import { MenuDeleteDTOResponse } from './dto/menu.delete.dto'
import { MenuGroupService } from './menu.group.service'
import {
  GrantPermissionDTO,
  GrantPermissionResponseDTO,
} from './dto/menu.grant.permission.dto'
import { AccountPermissionModel } from '../model/account.permission.model'
import { MenuPermissionService } from './menu.permission.service'
import { MenuGroupModel } from 'src/model/menu.group.model'

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuModel)
    private readonly menuRepo: Repository<MenuModel>,

    @InjectRepository(MenuGroupModel)
    private readonly menuGroupRepo: Repository<MenuGroupModel>,

    private readonly menuGroupService: MenuGroupService,
    private readonly menuPermissionService: MenuPermissionService,
  ) {}

  private logger = new Logger('HTTP')

  async all() {
    return await this.menuRepo.find()
  }

  async detail(id: number) {
    let responseBuilder: any = {}
    const dataSet = await this.menuRepo.findOne({
      where: {
        id: id,
      },
    })

    if (dataSet) {
      responseBuilder = dataSet
      const permissionSet = []
      if (responseBuilder.permission === undefined)
        responseBuilder.permission = []
      const permissionData = await this.menuPermissionService.menu_permission(
        id,
      )

      for (const a in permissionData) {
        permissionSet.push(permissionData[a])
      }
      responseBuilder.permission = permissionSet
    }

    return responseBuilder
  }

  async edit(data: MenuEditDTO, id: number) {
    const menuResp = new MenuEditResponseDTO()
    const menuRes = await this.menuRepo.update(id, data).then(async () => {
      return await this.detail(id)
    })

    if (menuRes) {
      menuResp.message = 'Menu Updated Successfully'
      menuResp.status = HttpStatus.OK
      menuResp.returning = await menuRes
    } else {
      menuResp.message = 'Menu Updated Failed'
      menuResp.status = HttpStatus.BAD_REQUEST
    }

    return menuResp
  }

  async delete_soft(id: number) {
    const response = new MenuDeleteDTOResponse()
    const oldMeta = await this.detail(id)
    const accountRes = this.menuRepo.softDelete({ id })
    if (accountRes) {
      response.message = 'Menu deleted successfully'
      response.status = HttpStatus.OK
      response.returning = oldMeta
    } else {
      response.message = 'Menu failed to delete'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async add(data: MenuAddDTO) {
    const menuResp = new MenuAddResponseDTO()
    const menuRes = await this.menuRepo.save(data).then(async (returning) => {
      return await this.detail(returning.id)
    })

    if (menuRes) {
      menuResp.message = 'Menu Added Successfully'
      menuResp.status = HttpStatus.OK
      menuResp.returning = await menuRes
    } else {
      menuResp.message = 'Menu Added Failed'
      menuResp.status = HttpStatus.BAD_REQUEST
    }

    return menuResp
  }

  async tree_grouper() {
    const menuGroupSet = []
    const grouper = await this.menuGroupService.all()

    for (const a in grouper) {
      menuGroupSet.push({
        id: grouper[a].id,
        show_on_menu: 'Y',
        level: 1,
        label: grouper[a].name,
        items: await this.tree(grouper[a].id, grouper[a].id),
      })
    }

    return menuGroupSet
  }

  async tree_manager() {
    const menuGroupSet = []
    const grouper = await this.menuGroupService.all()

    for (const a in grouper) {
      menuGroupSet.push({
        show_on_menu: 'Y',
        key: `${grouper[a].id}`,
        data: {
          id: grouper[a].id,
          label: grouper[a].name,
        },
        level: 1,
        children: await this.tree_manager_child(
          grouper[a].id,
          `${grouper[a].id}`,
        ),
      })
    }

    return { root: menuGroupSet }
  }

  async tree_manager_paginate(param: any) {
    const menuGroupSet = []
    const grouper = await this.menuGroupService.paginate(param)

    for (const a in grouper) {
      menuGroupSet.push({
        show_on_menu: 'Y',
        key: `${grouper[a].id}`,
        data: {
          id: grouper[a].id,
          label: grouper[a].name,
        },
        level: 1,
        children: await this.tree_manager_child(
          grouper[a].id,
          `${grouper[a].id}`,
        ),
      })
    }

    return { root: menuGroupSet }
  }

  async tree_manager_child(parent: number, key: string) {
    let currentKey = key.split('-')
    const menuSet = []
    const menuList = await this.menuRepo.find({
      where: {
        parent: parent,
      },
      order: {
        created_at: 'ASC',
        show_order: 'DESC',
      },
    })

    for (const a in menuList) {
      const permissionData = await this.menuPermissionService.menu_permission(
        menuList[a].id,
      )
      const menuItem = menuList[a]
      currentKey = [key]
      currentKey.push(`${menuList[a].id}`)
      const currentSetKey = currentKey.join('-')
      const menuChild = await this.tree_manager_child(
        menuItem.id,
        currentSetKey,
      )

      menuSet.push({
        key: currentSetKey,
        data: {
          id: menuList[a].id,
          label: menuItem.name,
          identifier: menuItem.identifier,
          icon: menuItem.icon,
          permission: permissionData || [],
          to: `${menuItem.url}`,
        },
        children: menuChild,
        show_on_menu: menuItem.show_on_menu,
      })
    }

    return menuSet
  }

  async tree(parent: number, group: number) {
    const menuSet = []
    const menuList = this.menuRepo
      .createQueryBuilder(this.menuRepo.metadata.name)
      .leftJoin(
        `${this.menuRepo.metadata.name}.group`,
        this.menuGroupRepo.metadata.name,
      )
      .where(`${this.menuRepo.metadata.name}.parent = :parent`, {
        parent: parent,
      })
      .andWhere(`${this.menuRepo.metadata.name}.show_on_menu = :show_on_menu`, {
        show_on_menu: 'Y',
      })
      .andWhere(`${this.menuRepo.metadata.name}.menu_group = :group`, {
        group: group,
      })
      .orderBy(`${this.menuRepo.metadata.name}.show_order`, 'DESC')
    // const menuList = await this.menuRepo.find({
    //   where: {
    //     parent: parent,
    //     show_on_menu: 'Y',
    //     menu_group: group,
    //   },
    //   order: {
    //     show_order: 'DESC',
    //   },
    // })

    for (const a in menuList) {
      const menuItem = menuList[a]
      const menuChild = await this.tree(menuItem.id, group)
      if (menuChild.length > 0) {
        menuSet.push({
          id: menuItem.id,
          label: menuItem.name,
          items: menuChild,
          grouper: menuItem.menu_group,
          ordered: menuItem.show_order,
          remark: menuItem.remark,
          parent: menuItem.parent,
          show_on_menu: menuItem.show_on_menu,
          color: menuItem.group_color,
          icon: menuItem.icon,
          to: `${menuItem.url}`,
          level: menuItem.level,
        })
      } else {
        menuSet.push({
          id: menuItem.id,
          label: menuItem.name,
          grouper: menuItem.menu_group,
          ordered: menuItem.show_order,
          remark: menuItem.remark,
          parent: menuItem.parent,
          show_on_menu: menuItem.show_on_menu,
          color: menuItem.group_color,
          icon: menuItem.icon,
          to: `${menuItem.url}`,
          level: menuItem.level,
        })
      }
    }

    return menuSet
  }

  async checkChild(parent: number) {
    return await this.menuRepo.find({ where: { parent: parent } })
  }
}
