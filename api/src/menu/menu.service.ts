import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MenuModel } from '../model/menu.model'
import { Repository } from 'typeorm'
import { MenuAddDTO, MenuAddResponseDTO } from './dto/menu.add.dto'
import { AccountPrivilegesModel } from '../model/account.privileges.model'

import { GrantAccessDTO, GrantAccessResponseDTO } from './dto/menu.grant.privileges.dto'
import { MenuEditDTO, MenuEditResponseDTO } from './dto/menu.edit.dto'
import { throws } from 'assert'
import { MenuDeleteDTOResponse } from './dto/menu.delete.dto'
import { MenuGroupService } from './menu.group.service'
import { group } from 'console'
import { GrantPermissionDTO, GrantPermissionResponseDTO } from './dto/menu.grant.permission.dto'
import { AccountPermissionModel } from '../model/account.permission.model'

@Injectable()
export class MenuService {
    constructor(
        @InjectRepository(MenuModel)
        private readonly menuRepo: Repository<MenuModel>,

        @InjectRepository(AccountPrivilegesModel)
        private readonly accountPrivilegesRepo: Repository<AccountPrivilegesModel>,

        @InjectRepository(AccountPermissionModel)
        private readonly accountPermissionRepo: Repository<AccountPermissionModel>,

        private readonly menuGroupService: MenuGroupService
    ) { }

    private logger = new Logger('HTTP')


    async all () {
        return await this.menuRepo.find()
    }

    async detail (id: number) {
        return await this.menuRepo.findOne({
            where: {
                id: id
            }
        })
    }

    async edit (data: MenuEditDTO, id: number) {
        const menuResp = new MenuEditResponseDTO()
        const menuRes = await this.menuRepo.update(id, data).then(async returning => {
            return await this.detail(id)
        })

        if (menuRes) {
            menuResp.message = ''
            menuResp.status = HttpStatus.OK
            menuResp.returning = await menuRes
        } else {
            menuResp.message = ''
            menuResp.status = HttpStatus.BAD_REQUEST
        }

        return menuResp
    }

    async delete_soft (id: number) {
        let response = new MenuDeleteDTOResponse()
        const oldMeta = await this.detail(id)
        var accountRes = this.menuRepo.softDelete({ id })
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

    async add (data: MenuAddDTO) {
        const menuResp = new MenuAddResponseDTO()
        const menuRes = await this.menuRepo.save(data).then(async returning => {
            return await this.detail(returning.id)
        })

        if (menuRes) {
            menuResp.message = ''
            menuResp.status = HttpStatus.OK
            menuResp.returning = await menuRes
        } else {
            menuResp.message = ''
            menuResp.status = HttpStatus.BAD_REQUEST
        }

        return menuResp
    }

    async grant_menu_permission (permission: GrantPermissionDTO) {
        const menuResp = new GrantPermissionResponseDTO()
        const menuRes = await this.accountPermissionRepo.save(permission).then(async returning => {
            return returning
        })

        if (menuRes) {
            menuResp.message = 'Permission Granted Successfully'
            menuResp.status = HttpStatus.OK
            menuResp.returning = menuRes
        } else {
            menuResp.message = 'Permission Granted Failed'
            menuResp.status = HttpStatus.BAD_REQUEST
        }

        return menuResp
    }

    async grant_menu_access (privileges: GrantAccessDTO) {
        let grantResp = new GrantAccessResponseDTO()
        const menuRes = await this.accountPrivilegesRepo.save(privileges).then(async returning => {
            return returning
        })

        if (menuRes) {
            grantResp.message = 'Access Granted Successfully'
            grantResp.status = HttpStatus.OK
            grantResp.returning = menuRes
        } else {
            grantResp.message = 'Access Granted Failed'
            grantResp.status = HttpStatus.BAD_REQUEST
        }

        return grantResp
    }

    async tree_grouper () {
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

    async tree_manager () {
        const menuGroupSet = []
        const grouper = await this.menuGroupService.all()

        for (const a in grouper) {
            menuGroupSet.push({
                show_on_menu: 'Y',
                key: `${grouper[a].id}`,
                data: {
                    id: grouper[a].id,
                    label: grouper[a].name
                },
                level: 1,
                children: await this.tree_manager_child(grouper[a].id, `${grouper[a].id}`),
            })
        }

        return { root: menuGroupSet }
    }

    async tree_manager_child (parent: number, key: string) {
        let currentKey = key.split('-')
        let menuSet = []
        let menuList = await this.menuRepo.find({
            where: {
                parent: parent,
                show_on_menu: 'Y'
            }, order: {
                show_order: 'DESC'
            }
        })

        for (const a in menuList) {
            const menuItem = menuList[a]
            currentKey = [key]
            currentKey.push(`${menuList[a].id}`)
            const currentSetKey = currentKey.join('-')
            const menuChild = await this.tree_manager_child(menuItem.id, currentSetKey)

            menuSet.push({
                key: currentSetKey,
                data: {
                    id: menuList[a].id,
                    label: menuItem.name,
                    icon: menuItem.icon,
                    to: `${menuItem.identifier}`
                },
                children: menuChild,
                show_on_menu: menuItem.show_on_menu
            })
        }

        return menuSet
    }

    async tree (parent: number, group: number) {
        let menuSet = []
        let menuList = await this.menuRepo.find({
            where: {
                parent: parent,
                show_on_menu: 'Y',
                menu_group: group
            }, order: {
                show_order: 'DESC'
            }
        })

        for (const a in menuList) {
            const menuItem = menuList[a]
            const menuChild = await this.tree(menuItem.id, group)
            if (menuChild.length > 0) {
                menuSet.push({
                    label: menuItem.name,
                    items: menuChild,
                    grouper: menuItem.menu_group,
                    ordered: menuItem.show_order,
                    remark: menuItem.remark,
                    parent: menuItem.parent,
                    show_on_menu: menuItem.show_on_menu,
                    color: menuItem.group_color,
                    icon: menuItem.icon,
                    to: `${menuItem.identifier}`,
                    level: menuItem.level
                })
            } else {
                menuSet.push({
                    label: menuItem.name,
                    grouper: menuItem.menu_group,
                    ordered: menuItem.show_order,
                    remark: menuItem.remark,
                    parent: menuItem.parent,
                    show_on_menu: menuItem.show_on_menu,
                    color: menuItem.group_color,
                    icon: menuItem.icon,
                    to: `${menuItem.identifier}`,
                    level: menuItem.level
                })
            }
        }

        return menuSet
    }

    async checkChild (parent: number) {
        return await this.menuRepo.find({ where: { parent: parent } })
    }

}
