import { CoreMenuPermissionModel } from '@/models/core.menu.permission.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { response } from 'express'
import { DataSource, Repository } from 'typeorm'

@Injectable()
export class MenuPermissionService {
  constructor(
    @InjectRepository(CoreMenuPermissionModel)
    private readonly menuPermissionRepo: Repository<CoreMenuPermissionModel>,
    private dataSource: DataSource
  ) {}

  async add(data: CoreMenuPermissionModel): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.menuPermissionRepo
      .save(data)
      .then(async (returning) => {
        response.message = 'Menu Permission Added Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = await this.detail(returning.id)
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async edit(
    data: CoreMenuPermissionModel,
    id: number
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.menuPermissionRepo
      .update(id, data)
      .then(async (returning) => {
        response.message = 'Menu Permission Updated Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = await this.detail(id)
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async delete_hard(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldData = await this.detail(id)
    return await this.menuPermissionRepo
      .delete({ id })
      .then(() => {
        response.message = 'Menu Permission Deleted Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldData
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async delete_soft(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldData = await this.detail(id)
    return await this.menuPermissionRepo
      .softDelete({ id })
      .then(() => {
        response.message = 'Menu Permission Deleted Successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldData
        return response
      })
      .catch((e) => {
        throw new Error(e.message)
      })
  }

  async detail(id: number) {
    return await this.menuPermissionRepo.findOne({ where: { id: id } })
  }

  async menu_permission(id: number) {
    return await this.dataSource
      .getRepository(CoreMenuPermissionModel)
      .createQueryBuilder('menu_permission')
      .where(`menu_permission.menu = :menu_id`, {
        menu_id: id,
      })
      .getMany()
  }

  async all() {
    return await this.menuPermissionRepo.find()
  }
}
