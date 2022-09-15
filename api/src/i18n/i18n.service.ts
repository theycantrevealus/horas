import { I18nModel } from '@/model/i18n.model'
import { Injectable, Logger, HttpStatus } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { I18nAddDTO, I18nAddDTOResponse } from './dto/i18n.add.dto'
import { I18nDeleteDTOResponse } from './dto/i18n.delete.dto'
import { I18nEditDTO, I18nEditDTOResponse } from './dto/i18n.edit.dto'

@Injectable()
export class I18nService {
  constructor(
    @InjectRepository(I18nModel)
    private readonly i18nRepo: Repository<I18nModel>,
  ) {}

  private logger = new Logger('HTTP')

  async all() {
    //
  }

  async fetch_caption(route: string, iso: string) {
    return await this.i18nRepo
      .createQueryBuilder('i18n')
      .where('route = :route', { route })
      .andWhere('iso_code_3 = :iso', { iso })
      .getMany()
  }

  async detail(id: number) {
    return await this.i18nRepo.createQueryBuilder('i18n').where({ id }).getOne()
  }

  async iso_list() {
    const isoList = []
    const data = await this.i18nRepo
      .createQueryBuilder('i18n')
      .distinctOn(['iso_code_3'])
      .getMany()
    data.map((e) => {
      isoList.push(e.iso_code_3)
    })
    return isoList
  }

  async add(data: I18nAddDTO) {
    const response = new I18nAddDTOResponse()
    const masterItemRes = this.i18nRepo.save(data).then(async (returning) => {
      return await this.detail(returning.id)
    })
    if (masterItemRes) {
      response.message = `i18n ${data.iso_code_3} added successfully`
      response.status = HttpStatus.OK
      response.returning = await masterItemRes
    } else {
      response.message = `Failed to add ${data.iso_code_3} i18n`
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async edit(data: I18nEditDTO, id: string) {
    const response = new I18nEditDTOResponse()
    const i18nRes = this.i18nRepo.update(id, data).then(async (returning) => {
      return await this.detail(parseInt(id))
    })
    if (i18nRes) {
      response.message = 'i18n updated successfully'
      response.status = HttpStatus.OK
      response.returning = await i18nRes
    } else {
      response.message = 'i18n failed to update'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async delete_soft(id: number) {
    const response = new I18nDeleteDTOResponse()
    const oldMeta = await this.detail(id)
    const i18nRes = this.i18nRepo.softDelete({ id })
    if (i18nRes) {
      response.message = 'i18n deleted successfully'
      response.status = HttpStatus.OK
      response.returning = oldMeta
    } else {
      response.message = 'i18n failed to delete'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }
}
