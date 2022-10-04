import { Corei18nComponentModel } from '@/models/core.i18n.compontent.model'
import { Corei18nModel } from '@/models/core.i18n.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Corei18nDTOAdd } from './dtos/i18n.add'
import { Corei18nDTOEdit } from './dtos/i18n.edit'

@Injectable()
export class Corei18nService {
  constructor(
    @InjectRepository(Corei18nModel)
    private readonly corei18nRepo: Repository<Corei18nModel>,

    @InjectRepository(Corei18nComponentModel)
    private readonly corei18nComponentRepo: Repository<Corei18nComponentModel>,

    private dataSource: DataSource
  ) {}

  private logger = new Logger('HTTP')

  async all() {
    return await this.dataSource
      .getRepository(Corei18nModel)
      .createQueryBuilder('core_i18n')
      .leftJoinAndSelect('core_i18n.components', 'core_i18n_component')
      .getMany()
  }

  async detail(uid: string) {
    return await this.dataSource
      .getRepository(Corei18nModel)
      .createQueryBuilder('core_i18n')
      .leftJoinAndSelect('core_i18n.components', 'core_i18n_component')
      .where('core_i18n.uid = :uid', {
        uid: uid,
      })
      .getOne()
  }

  async edit(data: Corei18nDTOEdit, uid: string): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.corei18nRepo
      .update(uid, data)
      .then(async () => {
        // await this.corei18nComponentRepo.delete({ language: data })
        const propComponent = data.components.map(async (e) => {
          await this.corei18nComponentRepo.save(e)
        })

        return await Promise.all(propComponent).then(async () => {
          response.message = 'Language Updated Successfully'
          response.statusCode = HttpStatus.OK
          response.table_target = 'core_i18n'
          response.method = 'PUT'
          response.action = 'U'
          response.transaction_id = uid
          response.payload = await this.detail(uid)
          return response
        })
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async delete_soft(uid: string): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(uid)
    return await this.corei18nRepo
      .softDelete({ uid })
      .then(async () => {
        response.message = 'Menu deleted successfully'
        response.statusCode = HttpStatus.OK
        response.table_target = 'menu'
        response.method = 'DELETE'
        response.action = 'D'
        response.transaction_id = uid
        response.payload = oldMeta
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async add(data: Corei18nDTOAdd): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const newLanguage = new Corei18nModel(data)
    return await this.corei18nRepo
      .save(newLanguage)
      .then(async (returning) => {
        const propComponent = data.components.map(async (e) => {
          const newComponent = new Corei18nComponentModel({
            ...e,
            language: returning.uid,
          })
          await this.corei18nComponentRepo.save(newComponent).catch((e) => {
            console.log(e)
          })
        })
        return Promise.all(propComponent).then(async () => {
          response.message = 'Language Added Successfully'
          response.table_target = 'menu'
          response.transaction_id = returning.uid
          response.statusCode = HttpStatus.OK
          response.action = 'I'
          response.method = 'POST'
          response.payload = await this.detail(returning.uid)
          return response
        })
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }
}
