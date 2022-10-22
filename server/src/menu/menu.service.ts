import { CoreMenuGroupModel } from '@/models/core.menu.group.model'
import { CoreMenuModel } from '@/models/core.menu.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { CoreMenuDTOEdit } from './dtos/menu.edit'
import { MenuGroupService } from './menu.group.service'
import { MenuPermissionService } from './menu.permission.service'

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(CoreMenuModel)
    private readonly menuRepo: Repository<CoreMenuModel>,

    @InjectRepository(CoreMenuGroupModel)
    private readonly menuGroupRepo: Repository<CoreMenuGroupModel>,

    private readonly menuGroupService: MenuGroupService,
    private readonly menuPermissionService: MenuPermissionService,
    private dataSource: DataSource
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
        id
      )

      for (const a in permissionData) {
        permissionSet.push(permissionData[a])
      }
      responseBuilder.permission = permissionSet
    }

    return responseBuilder
  }

  async edit(data: CoreMenuDTOEdit, id: number): Promise<GlobalResponse> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.startTransaction()
    const dataSet = await this.detail(id)
    Object.assign(dataSet, data)

    try {
      const response = new GlobalResponse()
      return await queryRunner.manager
        .save(dataSet)
        .then(async () => {
          response.message = 'Menu Updated Successfully'
          response.statusCode = HttpStatus.OK
          response.table_target = 'menu'
          response.method = 'PUT'
          response.action = 'U'
          response.transaction_id = id
          response.payload = await this.detail(id)
          queryRunner.commitTransaction()
          return response
        })
        .catch((e) => {
          throw new Error(e.message)
        })
    } catch (e) {
      await queryRunner.rollbackTransaction()
      throw new BadRequestException(e)
    } finally {
      await queryRunner.release()
    }
  }

  async delete_soft(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return await this.menuRepo
      .softDelete({ id })
      .then(() => {
        response.message = 'Menu deleted successfully'
        response.statusCode = HttpStatus.OK
        response.table_target = 'menu'
        response.method = 'DELETE'
        response.action = 'D'
        response.transaction_id = id
        response.payload = oldMeta
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async add(data: CoreMenuModel): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.menuRepo
      .save(data)
      .then(async (returning) => {
        response.message = 'Menu Added Successfully'
        response.table_target = 'menu'
        response.transaction_id = returning.id
        response.statusCode = HttpStatus.OK
        response.action = 'I'
        response.method = 'POST'
        response.payload = await this.detail(returning.id)
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async tree_grouper() {
    return await this.menuGroupService
      .all()
      .then(async (grouper) => {
        const menuGroupSet = []
        const prom = grouper.map(async (a) => {
          menuGroupSet.push({
            id: a.id,
            show_on_menu: 'Y',
            level: 1,
            label: a.name,
            items: await this.tree(a.id, a.id),
          })
        })

        return await Promise.all(prom).then(async (b) => {
          return await menuGroupSet.sort((a, b) =>
            a.id > b.id ? 1 : b.id > a.id ? -1 : 0
          )
        })
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async tree_manager() {
    return {
      root: await this.menuGroupService.all().then(async (grouper) => {
        const menuGroupSet = []
        const prom = grouper.map(async (a) => {
          menuGroupSet.push({
            show_on_menu: 'Y',
            key: `${a.id}`,
            data: {
              id: a.id,
              label: a.name,
            },
            level: 1,
            children: await this.tree_manager_child(a.id, `${a.id}`),
          })
        })

        return await Promise.all(prom).then(async (b) => {
          return await menuGroupSet.sort((a, b) =>
            a.id > b.id ? 1 : b.id > a.id ? -1 : 0
          )
        })
      }),
    }
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
          `${grouper[a].id}`
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

    const prom = menuList.map(async (a) => {
      const permissionData = await this.menuPermissionService.menu_permission(
        a.id
      )
      const menuItem = a
      currentKey = [key]
      currentKey.push(`${a.id}`)
      const currentSetKey = currentKey.join('-')
      const menuChild = await this.tree_manager_child(
        menuItem.id,
        currentSetKey
      )

      menuSet.push({
        key: currentSetKey,
        data: {
          id: a.id,
          label: menuItem.name,
          identifier: menuItem.identifier,
          icon: menuItem.icon,
          permission: permissionData || [],
          to: `${menuItem.url}`,
        },
        children: menuChild,
        show_on_menu: menuItem.show_on_menu,
      })
    })

    return await Promise.all(prom).then((b) => {
      return menuSet
    })
  }

  async tree(parent: number, group: number) {
    return await this.dataSource
      .getRepository(CoreMenuModel)
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.menu_group', 'menu_group')
      .where('menu.parent = :parent', {
        parent: parent,
      })
      .andWhere('menu.show_on_menu = :show_on_menu', {
        show_on_menu: 'Y',
      })
      .andWhere('menu.menu_group = :group', {
        group: group,
      })
      .orderBy('menu.show_order', 'ASC')
      .getMany()
      .then(async (menuList) => {
        const menuSet = []
        const prom = menuList.map(async (a) => {
          const menuItem = a
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
        })

        return await Promise.all(prom).then(() => {
          return menuSet.sort((a, b) =>
            a.id > b.id ? 1 : b.id > a.id ? -1 : 0
          )
        })
      })
  }

  async checkChild(parent: number) {
    return await this.menuRepo.find({ where: { parent: parent } })
  }
}
