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

@Injectable()
export class MenuService {
    constructor(
        @InjectRepository(MenuModel)
        private readonly menuRepo: Repository<MenuModel>,

        @InjectRepository(AccountPrivilegesModel)
        private readonly accountPrivilegesRepo: Repository<AccountPrivilegesModel>
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

    async grant_menu_access (privileges): Promise<GrantAccessResponseDTO> {
        let grantResp = new GrantAccessResponseDTO()
        privileges.menu = await this.menuRepo.findOne({ where: { id: privileges.menu } })
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
            //Check Child
            menuSet.push({
                name: menuItem.name,
                child: await this.tree(menuItem.id, group),
                color: menuItem.group_color,
                icon: menuItem.icon,
                identifier: menuItem.identifier
            })
        }

        return menuSet
    }

    async checkChild (parent: number) {
        return await this.menuRepo.find({ where: { parent: parent } })
    }

}
