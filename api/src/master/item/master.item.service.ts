import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MasterItemModel } from '../../model/inventory/master.item.model'
import { Repository } from 'typeorm'
import {
  MasterItemAddDTO,
  MasterItemAddDTOResponse,
} from './dto/master.item.add.dto'
import {
  MasterItemAliasAddDTO,
  MasterItemAliasAddDTOResponse,
} from './dto/master.item.alias.add.dto'
import { MasterXItemAliasModel } from '../../model/inventory/master.x.item.alias.model'
import { MasterItemDeleteDTOResponse } from './dto/master.item.delete.dto'
import { throws } from 'assert'
import {
  MasterItemAliasEditDTO,
  MasterItemAliasEditDTOResponse,
} from './dto/master.item.alias.edit.dto'
import {
  MasterItemEditDTO,
  MasterItemEditDTOResponse,
} from './dto/master.item.edit.dto'

@Injectable()
export class MasterItemService {
  constructor(
    @InjectRepository(MasterItemModel)
    private readonly masterItemRepo: Repository<MasterItemModel>,

    @InjectRepository(MasterXItemAliasModel)
    private readonly masterItemAliasRepo: Repository<MasterXItemAliasModel>,
  ) {}

  private logger = new Logger('HTTP')

  async all() {
    return await this.masterItemRepo.createQueryBuilder('master_item').getMany()
  }

  async detail(uid: string) {
    return await this.masterItemRepo
      .createQueryBuilder('master_item')
      .where('master_item.uid = :uid', { uid })
      .getOne()
  }

  async add(data: MasterItemAddDTO) {
    let response = new MasterItemAddDTOResponse()
    const masterItemRes = this.masterItemRepo
      .save(data)
      .then(async (returning) => {
        return await this.detail(returning.uid)
      })
    if (masterItemRes) {
      response.message = 'Item added successfully'
      response.status = HttpStatus.OK
      response.returning = await masterItemRes
    } else {
      response.message = 'Failed to add item'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async edit(item: MasterItemEditDTO, uid: string) {
    let response = new MasterItemEditDTOResponse()
    const masterItemRes = this.masterItemRepo
      .update(uid, {
        code: item.code,
        name: item.name,
        remark: item.remark,
      })
      .then(async (returning) => {
        return await this.detail(uid)
      })
    if (masterItemRes) {
      response.message = 'Master Item updated successfully'
      response.status = HttpStatus.OK
      response.returning = await masterItemRes
    } else {
      response.message = 'Master Item failed to update'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async master_item_alias_delete_soft(uid: string) {
    const masterItemAlias = await this.item_alias(uid)
    masterItemAlias.map(async (e) => {
      const getID = String(e.id)
      await this.masterItemAliasRepo.softDelete(getID)
    })
  }

  async master_item_delete_soft(uid: string) {
    let response = new MasterItemDeleteDTOResponse()
    const oldMeta = await this.detail(uid)
    var masterItemRes = await this.masterItemRepo.softDelete({ uid })
    if (masterItemRes) {
      await this.master_item_alias_delete_soft(uid)
      response.message = 'Item deleted successfully'
      response.status = HttpStatus.OK
      response.returning = oldMeta
    } else {
      response.message = 'Item failed to delete'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async detail_alias(id: string) {
    return await this.masterItemAliasRepo
      .createQueryBuilder('master_x_item_alias')
      .where('master_x_item_alias.id = :id', { id })
      .getOne()
  }

  async item_alias(uid: string) {
    return await this.masterItemAliasRepo
      .createQueryBuilder('master_x_item_alias')
      .where('master_x_item_alias.item = :uid', { uid })
      .getMany()
  }

  async edit_alias(itemAlias: MasterItemAliasEditDTO, id: string) {
    let response = new MasterItemAliasEditDTOResponse()
    const masterItemAliasRes = this.masterItemAliasRepo
      .update(id, {
        name: itemAlias.name,
      })
      .then(async (returning) => {
        return await this.detail_alias(id)
      })
    if (masterItemAliasRes) {
      response.message = 'Master item alias updated successfully'
      response.status = HttpStatus.OK
      response.returning = await masterItemAliasRes
    } else {
      response.message = 'Master item alias failed to update'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async add_alias(data: MasterItemAliasAddDTO) {
    let response = new MasterItemAliasAddDTOResponse()
    const masterItemAliasRes = this.masterItemAliasRepo
      .save(data)
      .then(async (returning) => {
        return await this.detail_alias(String(returning.id))
      })
    if (masterItemAliasRes) {
      response.message = 'Item alias added successfully'
      response.status = HttpStatus.OK
      response.returning = await masterItemAliasRes
    } else {
      response.message = 'Failed to add item'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }
}
