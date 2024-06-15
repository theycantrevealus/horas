import { AccountService } from '@core/account/account.service'
import { MenuAddDTO, MenuEditDTO } from '@core/menu/dto/menu'
import {
  IMenuTree,
  IMenuTreeManager,
} from '@core/menu/interfaces/menu.tree.interface'
import {
  MenuGroup,
  MenuGroupDocument,
} from '@core/menu/schemas/menu.group.model'
import { Menu, MenuDocument } from '@core/menu/schemas/menu.model'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(Menu.name)
    private menuModel: Model<MenuDocument>,

    @InjectModel(MenuGroup.name)
    private menuGroupModel: Model<MenuGroupDocument>,

    @Inject(AccountService)
    private readonly accountService: AccountService,

    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}
  async all(parameter: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MENU_SELECT',
      transaction_id: '',
    } satisfies GlobalResponse

    return await prime_datatable(parameter, this.menuModel)
      .then((result) => {
        response.payload = result.payload
        return response
      })
      .catch((error: Error) => {
        response.message = error.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async detail(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MENU_DETAIL',
      transaction_id: id,
    } satisfies GlobalResponse

    return this.menuModel
      .findOne({ id: id })
      .then((result) => {
        response.payload = result
        return response
      })
      .catch((error: Error) => {
        response.message = error.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async find(filter: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MENU_SEARCH',
      transaction_id: '',
    } satisfies GlobalResponse

    return this.menuModel
      .findOne(filter)
      .exec()
      .then((result) => {
        response.payload = result
        return response
      })
      .catch((error: Error) => {
        response.message = error.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async findMany(filter: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MENU_SEARCH',
      transaction_id: '',
    } satisfies GlobalResponse

    return this.menuModel
      .find(filter)
      .exec()
      .then((result) => {
        response.payload = {
          data: result,
        }
        return response
      })
      .catch((error: Error) => {
        response.message = error.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async treeManager(parent = '', group = '', keyMapper: string[] = []) {
    const buildMenu: any[] = []
    if (group === '') {
      await this.menuGroupModel
        .find({ deleted_at: null })
        .sort({ _id: 1 })
        .exec()
        .then(async (menuGroupDetail) => {
          await Promise.all(
            menuGroupDetail.map(async (mGroup, keyMap) => {
              const CKeyMapper = [...keyMapper, keyMap.toString()]

              const child: any[] = await this.treeManager(
                '',
                mGroup.id,
                CKeyMapper
              )

              const dataSet: IMenuTreeManager = {
                id: mGroup.id,
                key: keyMap.toString(),
                label: mGroup.name,
                to: '',
                show_on_menu: true,
                data: {
                  id: mGroup.id,
                  label: mGroup.name,
                  parent: '',
                  menu_group: '',
                  identifier: '',
                  to: '',
                  icon: '',
                  show_on_menu: true,
                  __v: mGroup.__v,
                },
                icon: '',
                children: child,
              }

              buildMenu.push(dataSet)
            })
          )

          buildMenu.sort((a, b) => (a.id < b.id ? -1 : 1))
        })
    } else {
      await this.menuModel
        .find({
          $and: [{ parent: parent, 'menu_group.id': group, deleted_at: null }],
        })
        .sort({ show_order: 1 })
        .exec()
        .then(async (result) => {
          await Promise.all(
            result.map(async (data, keyMap) => {
              const CKeyMapper = [...keyMapper, keyMap.toString()]

              const child: any[] = await this.treeManager(
                data.id,
                group,
                CKeyMapper
              )
              const dataSet: IMenuTreeManager = {
                id: data.id,
                key: CKeyMapper.join('-'),
                label: data.name,
                to: data.url,
                show_on_menu: data.show_on_menu,
                data: {
                  id: data.id,
                  label: data.name,
                  parent: data.parent,
                  menu_group: data.menu_group,
                  identifier: data.identifier,
                  permission: data.permission,
                  to: data.url,
                  icon: data.icon,
                  show_on_menu: data.show_on_menu,
                  __v: data.__v,
                },
                icon: '',
                children: child,
              }

              buildMenu.push(dataSet)
              buildMenu.sort((a, b) => (a.show_order < b.show_order ? -1 : 1))
            })
          )
        })
    }

    return buildMenu
  }

  async tree(parent = '', group = '') {
    const buildMenu: any[] = []
    if (group === '') {
      await this.menuGroupModel
        .find({ deleted_at: null })
        .sort({ _id: 1 })
        .exec()
        .then(async (menuGroupDetail) => {
          await Promise.all(
            menuGroupDetail.map(async (mGroup) => {
              const child: any[] = await this.tree('', mGroup.id)
              const dataSet: IMenuTree = {
                id: mGroup.id,
                name: mGroup.name,
                url: '',
                icon: '',
                group_color: '',
                show_order: 1,
                show_on_menu: true,
                level: 1,
                items: child,
              }

              buildMenu.unshift(dataSet)
            })
          )
          buildMenu.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
        })
    } else {
      await this.menuModel
        .find({
          $and: [{ parent: parent, 'menu_group.id': group, deleted_at: null }],
        })
        .sort({ show_order: 1 })
        .exec()
        .then(async (result) => {
          await Promise.all(
            result.map(async (data) => {
              const child: any[] = await this.tree(data.id, group)
              const dataSet: IMenuTree = {
                id: data.id,
                name: data.name,
                url: data.url,
                icon: data.icon,
                group_color: data.group_color,
                show_order: data.show_order,
                show_on_menu: data.show_on_menu,
                level: data.level,
                items: child,
              }

              buildMenu.push(dataSet)
              buildMenu.sort((a, b) => (a.show_order < b.show_order ? -1 : 1))
            })
          )
        })
    }

    return buildMenu
  }

  async add(data: MenuAddDTO, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MENU_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    // Set Show Order Sorting
    const getLateOrder = await this.findMany({
      parent: data.parent,
      menu_group: data.menu_group,
    })
    data.show_order = getLateOrder.payload['data'].length + 1
    console.log(this.configService.get<string>('application.timezone'))
    return await this.menuModel
      .create({
        ...data,
        timezone: this.configService.get<string>('application.timezone'),
        created_by: account,
      })
      .then((result) => {
        response.message = 'Menu added successfully'
        response.payload = {
          id: result.id,
          ...result,
        }
        return response
      })
      .catch((error: Error) => {
        response.message = `Account failed to add. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async edit(parameter: MenuEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.menuModel.findOne({
        id: id,
      }),
      transaction_classify: 'MENU_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    await this.menuModel
      .findOneAndUpdate(
        {
          id: id,
          __v: parameter.__v,
        },
        {
          name: parameter.name,
          identifier: parameter.identifier,
          url: parameter.url,
          icon: parameter.icon,
          show_on_menu: parameter.show_on_menu,
          show_order: parameter.show_order,
          level: parameter.level,
          group_color: parameter.group_color,
          remark: parameter.remark,
          channel: parameter.channel,
          menu_group: parameter.menu_group,
          permission: parameter.permission,
        }
      )
      .exec()
      .then(async (result) => {
        if (result) {
          await this.accountService.accountUpdateAccess(id, parameter)
          result.__v++
          response.message = 'Menu updated successfully'
          response.payload = result
        } else {
          response.message = 'Menu failed to update'
          response.statusCode = {
            ...modCodes[this.constructor.name].error.databaseError,
            classCode: modCodes[this.constructor.name].defaultCode,
          }
          response.payload = result
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Menu failed to update. ${error.message}`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
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
      payload: await this.menuModel.findOne({
        id: id,
      }),
      transaction_classify: 'MENU_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    const data = await this.menuModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Menu deleted successfully'
          response.payload = result
        })
        .catch((error: Error) => {
          response.message = `Menu failed to delete. ${error.message}`
          response.statusCode = {
            ...modCodes[this.constructor.name].error.databaseError,
            classCode: modCodes[this.constructor.name].defaultCode,
          }
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `Menu failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      response.payload = {}
      throw new Error(JSON.stringify(response))
    }

    return response
  }
}
