import { MenuGroupAddDTO } from '@core/menu/dto/menu.group.add'
import {
  MenuGroupDocument,
  MenuGroupModel,
} from '@core/menu/schemas/menu.group.model'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Model } from 'mongoose'

@Injectable()
export class MenuGroupService {
  constructor(
    @InjectModel(MenuGroupModel.name)
    private menuGroupModel: Model<MenuGroupDocument>
  ) {}
  async all() {}

  async detail() {}

  async add(parameter: MenuGroupAddDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MENU_ADD',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = new this.menuGroupModel(parameter)
    await data
      .save()
      .then((result) => {
        response.message = 'Menu added successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Account failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })
    return response
  }
}
