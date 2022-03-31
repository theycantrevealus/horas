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
import { MenuGroupModel } from '../model/menu.group.model'
import { MenuGroupAddDTO, MenuGroupAddResponseDTO } from './dto/menu.group.add.dto'
import { MenuGroupEditDTO, MenuGroupEditResponseDTO } from './dto/menu.group.edit.dto'
import { MenuGroupDeleteDTOResponse } from './dto/menu.group.delete.dto'

@Injectable()
export class MenuGroupService {
    constructor(
        @InjectRepository(MenuGroupModel)
        private readonly menuGroupRepo: Repository<MenuGroupModel>
    ) { }

    async add (data: MenuGroupAddDTO) {
        const menuGroupResp = new MenuGroupAddResponseDTO()
        const menuGroupRes = await this.menuGroupRepo.save(data).then(async returning => {
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

    async edit (data: MenuGroupEditDTO, id: number) {
        const menuGroupResp = new MenuGroupEditResponseDTO()
        const menuGroupRes = await this.menuGroupRepo.update(id, data).then(async returning => {
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

    async delete_hard (id: number) {
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

    async delete_soft (id: number) {
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

    async all () {
        return await this.menuGroupRepo.find()
    }

    async detail (id: number) {
        return await this.menuGroupRepo.findOne({ where: { id: id } })
    }
}