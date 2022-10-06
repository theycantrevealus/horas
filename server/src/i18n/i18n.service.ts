import { Corei18nComponentModel } from '@/models/core.i18n.compontent.model'
import { Corei18nModel } from '@/models/core.i18n.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
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

  async detail(id: number) {
    return await this.dataSource
      .getRepository(Corei18nModel)
      .createQueryBuilder('core_i18n')
      .leftJoinAndSelect('core_i18n.components', 'core_i18n_component')
      .where('core_i18n.id = :id', {
        id: id,
      })
      .getOne()
  }

  async edit(data: Corei18nDTOEdit, id: number): Promise<GlobalResponse> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.startTransaction()
    try {
      const response = new GlobalResponse()
      const dataSet = new Corei18nModel(data)
      dataSet.id = id

      return await queryRunner.manager
        .save(dataSet)
        .then(async () => {
          //Rebase component by language
          response.message = 'Language Updated Successfully'
          response.statusCode = HttpStatus.OK
          response.table_target = 'core_i18n'
          response.method = 'PUT'
          response.action = 'U'
          response.transaction_id = id
          response.payload = await this.detail(id)
          await queryRunner.commitTransaction()
          return response
        })
        .catch(async (e) => {
          console.log(e)
          await queryRunner.rollbackTransaction()
          throw new BadRequestException(response)
        })
    } catch (e) {
      console.log(e)
      throw new BadRequestException(e)
    } finally {
      await queryRunner.release()
    }
  }

  async delete_soft(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return await this.corei18nRepo
      .softDelete({ id })
      .then(async () => {
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

  async add(data: Corei18nDTOAdd): Promise<GlobalResponse> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.startTransaction()
    try {
      const response = new GlobalResponse()
      const dataSet = new Corei18nModel(data)

      return await queryRunner.manager
        .save(dataSet)
        .then(async (returning) => {
          //Rebase component by language
          response.message = 'Language Updated Successfully'
          response.statusCode = HttpStatus.OK
          response.table_target = 'core_i18n'
          response.method = 'PUT'
          response.action = 'U'
          response.transaction_id = returning.id
          response.payload = await this.detail(returning.id)
          await queryRunner.commitTransaction()
          return response
        })
        .catch(async (e) => {
          console.log(e)
          await queryRunner.rollbackTransaction()
          throw new BadRequestException(response)
        })
    } catch (e) {
      console.log(e)
      throw new BadRequestException(e)
    } finally {
      await queryRunner.release()
    }
  }
}
