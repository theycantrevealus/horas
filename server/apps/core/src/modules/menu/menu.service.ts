import { Account, AccountDocument } from '@core/account/schemas/account.model'
import { MenuAddDTO, MenuEditDTO } from '@core/menu/dto/menu'
import {
  MenuGroup,
  MenuGroupDocument,
} from '@core/menu/schemas/menu.group.model'
import {
  IMenuTree,
  IMenuTreeManager,
  Menu,
  MenuDocument,
} from '@core/menu/schemas/menu.model'
import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MenuService {
  private readonly logger: Logger = new Logger(MenuService.name)
  constructor(
    @InjectModel(Menu.name)
    private menuModel: Model<MenuDocument>,

    @InjectModel(MenuGroup.name)
    private menuGroupModel: Model<MenuGroupDocument>,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>
  ) {}
  async all(parameter: any) {
    return await prime_datatable(parameter, this.menuModel)
  }

  async detail(id: string): Promise<Account> {
    return this.menuModel.findOne({ id: id })
  }

  async find(filter: any): Promise<Menu | undefined> {
    return this.menuModel.findOne(filter).exec()
  }

  async findMany(filter: any): Promise<Menu[] | undefined> {
    return this.menuModel.find(filter).exec()
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
      statusCode: '',
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
    data.show_order = getLateOrder.length + 1
    await this.menuModel
      .create({
        ...data,
        created_by: account,
      })
      .then((result) => {
        response.message = 'Menu added successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.payload = {
          id: result.id,
          ...result,
        }
      })
      .catch((error: Error) => {
        response.message = `Menu group failed to add. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })
    return response
  }

  async edit(parameter: MenuEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
          // Update all account with current access and permission
          await this.accountModel
            .findOneAndUpdate(
              {
                'access.id': id,
              },
              {
                $set: {
                  'access.$.name': parameter.name,
                  'access.$.url': parameter.url,
                  'access.$.identifier': parameter.identifier,
                },
              }
            )
            .exec()
            .catch((e) => {
              this.logger.debug(e)
            })

          // Reset all permission
          let updatedAccount = await this.accountModel
            .find(
              {
                'permission.menu.id': id,
              },
              'id -_id'
            )
            .exec()

          updatedAccount = updatedAccount.map(({ id }) => id)

          await this.accountModel
            .updateMany(
              {
                id: {
                  $in: updatedAccount,
                },
              },
              {
                $pull: {
                  permission: {
                    'menu.id': id,
                  },
                },
              }
            )
            .exec()

          parameter.permission = parameter.permission.map((e) => {
            return {
              domIdentity: e.domIdentity,
              dispatchName: e.dispatchName,
              menu: {
                id: id,
                name: parameter.name,
                url: parameter.url,
                identifier: parameter.identifier,
              },
            }
          })

          await this.accountModel
            .updateMany(
              {
                id: {
                  $in: updatedAccount,
                },
              },
              {
                $push: {
                  permission: {
                    $each: parameter.permission,
                  },
                },
              }
            )
            .exec()

          result.__v++
          response.message = 'Menu group updated successfully'
          response.payload = result
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
        } else {
          response.message = `Menu group failed to update`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          result.__v = parameter.__v
          response.payload = result
        }
      })
      .catch((error: Error) => {
        response.message = `Menu group failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
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
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Menu failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Menu failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }

    return response
  }
}
