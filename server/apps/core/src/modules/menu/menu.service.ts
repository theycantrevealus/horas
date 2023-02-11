import { MenuDocument, MenuModel } from '@core/menu/schemas/menu.model'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { Model, Types } from 'mongoose'

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(MenuModel.name)
    private menuModel: Model<MenuDocument>
  ) {}
  async all() {}

  async detail() {}

  async add(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MENU_ADD',
      transaction_id: null,
    } satisfies GlobalResponse
    return response
  }

  async edit(_id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MENU_EDIT',
      transaction_id: new Types.ObjectId(_id),
    } satisfies GlobalResponse
    return response
  }

  async delete(_id: string) {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MENU_DELETE',
      transaction_id: new Types.ObjectId(_id),
    } satisfies GlobalResponse
    return response
  }
}
