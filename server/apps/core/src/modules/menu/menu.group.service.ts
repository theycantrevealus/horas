import {
  MenuGroupAddDTO,
  MenuGroupEditDTO,
} from '@core/menu/dto/menu.group.add'
import {
  MenuGroup,
  MenuGroupDocument,
} from '@core/menu/schemas/menu.group.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MenuGroupService {
  constructor(
    @InjectModel(MenuGroup.name)
    private menuGroupModel: Model<MenuGroupDocument>
  ) {}
  async all(parameter: any) {
    return await prime_datatable(parameter, this.menuGroupModel)
  }

  async detail(id: string): Promise<Account> {
    return this.menuGroupModel.findOne({ id: id })
  }

  async find(filter: any): Promise<MenuGroup | undefined> {
    return this.menuGroupModel.findOne(filter).exec()
  }

  async add(data: MenuGroupAddDTO, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MENU_GROUP_ADD',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.menuGroupModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'Menu group added successfully'
        response.payload = {
          id: result.id,
          ...result,
        }
      })
      .catch((error: Error) => {
        response.message = `Menu group failed to add. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
    return response
  }

  async edit(parameter: MenuGroupEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.menuGroupModel.findOne({
        id: id,
      }),
      transaction_classify: 'MENU_GROUP_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    await this.menuGroupModel
      .findOneAndUpdate(
        {
          id: id,
          __v: parameter.__v,
        },
        {
          name: parameter.name,
          description: parameter.description,
        }
      )
      .exec()
      .then((result) => {
        result.__v++
        response.message = 'Menu group updated successfully'
        response.payload = result
      })
      .catch((error: Error) => {
        response.message = `Menu group failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.menuGroupModel.findOne({
        id: id,
      }),
      transaction_classify: 'MENU_GROUP_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    const data = await this.menuGroupModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Menu group deleted successfully'
          response.payload = result
        })
        .catch((error: Error) => {
          response.message = `Menu group failed to delete. ${error.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `Menu group failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }

    return response
  }
}
