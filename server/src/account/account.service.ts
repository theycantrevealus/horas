import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { AuthService } from '../auth/auth.service'
import { filterSetDT } from '@utilities/mod.lib'
import { AccountModel } from '@/models/account.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { AccountPermissionModel } from '@/models/account.permission.model'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { GrantAccessDTO } from './dtos/account.dto.grant.access'
import { GrantPermissionDTO } from './dtos/account.dto.grant.permission'
import {
  AccountLoginDTO,
  AccountLoginResponseDTO,
} from './dtos/account.dto.login'

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(CoreLogLoginModel)
    private readonly coreLogLoginRepo: Repository<CoreLogLoginModel>,

    @InjectRepository(AccountModel)
    private readonly accountRepo: Repository<AccountModel>,

    @InjectRepository(AccountPrivilegesModel)
    private readonly accountPrivileges: Repository<AccountPrivilegesModel>,

    @InjectRepository(AccountPermissionModel)
    private readonly accountPermission: Repository<AccountPermissionModel>,

    private readonly authService: AuthService,

    private dataSource: DataSource
  ) {}

  private logger = new Logger('HTTP')

  async login(account: AccountLoginDTO) {
    const loginResp = new AccountLoginResponseDTO()

    return await this.dataSource
      .getRepository(AccountModel)
      .createQueryBuilder('account')
      .where('deleted_at IS NULL')
      .orderBy('created_at', 'DESC')
      .andWhere('email = :email')
      .setParameters({ email: account.email })
      .getOne()
      .then(async (accountResp) => {
        if (accountResp && accountResp !== null) {
          const loginLog = this.coreLogLoginRepo.create({
            log_meta: JSON.stringify(account),
            account: accountResp,
          })

          return await this.coreLogLoginRepo
            .save(loginLog)
            .then(async (logID) => {
              const tokenSet = await this.authService.create_token({
                login_id: logID.id,
                account: accountResp,
                id: accountResp.id,
                email: accountResp.email,
                first_name: accountResp.first_name,
                last_name: accountResp.last_name,
              })
              const grantedPageSet = []
              const Page = await this.dataSource
                .getRepository(AccountPrivilegesModel)
                .createQueryBuilder('account_privileges')
                .innerJoinAndSelect('account_privileges.menu', 'menu')
                .where('account_privileges.account = :account', {
                  account: accountResp.id,
                })
                .getMany()
              for (const a in Page) {
                grantedPageSet.push(Page[a].menu)
              }
              const grantedPermSet = []
              const Permission = await this.accountPermission
                .createQueryBuilder('account_permission')
                .innerJoinAndSelect(
                  'account_permission.permission',
                  'menu_permission'
                )
                .where('account_permission.account = :account', {
                  account: accountResp.id,
                })
                .getMany()
              for (const a in Permission) {
                grantedPermSet.push(Permission[a].permission)
              }
              loginResp.message = 'Logged In Successfully'
              loginResp.account = accountResp
              loginResp.account.grantedPerm = grantedPermSet
              loginResp.account.grantedPage = grantedPageSet
              loginResp.token = tokenSet.token
              loginResp.status = HttpStatus.OK
              return loginResp
            })
            .catch((e) => {
              throw new Error(e.message)
            })
        } else {
          throw new Error('Login failed')
        }
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async getAccountAccessMeta(account: AccountModel) {
    return await this.dataSource
      .getRepository(AccountModel)
      .createQueryBuilder('account')
      .where('deleted_at IS NULL')
      .orderBy('created_at', 'DESC')
      .andWhere('id = :id')
      .setParameters({ id: account.id })
      .getOne()
      .then(async (accountResp) => {
        const grantedPageSet = []
        const Page = await this.dataSource
          .getRepository(AccountPrivilegesModel)
          .createQueryBuilder('account_privileges')
          .innerJoinAndSelect('account_privileges.menu', 'menu')
          .where('account_privileges.account = :account', {
            account: accountResp.id,
          })
          .getMany()
        for (const a in Page) {
          grantedPageSet.push(Page[a].menu)
        }
        const grantedPermSet = []
        const Permission = await this.accountPermission
          .createQueryBuilder('account_permission')
          .innerJoinAndSelect(
            'account_permission.permission',
            'menu_permission'
          )
          .where('account_permission.account = :account', {
            account: accountResp.id,
          })
          .getMany()
        for (const a in Permission) {
          grantedPermSet.push(Permission[a].permission)
        }
        return {
          account: accountResp,
          grantedPerm: grantedPermSet,
          grantedPage: grantedPageSet,
        }
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async detail(id: number) {
    const data = {
      account: {},
      access: [],
      permission: [],
    }
    data.account = await this.accountRepo
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.authority', 'authority')
      .where('account.id = :id', { id })
      .getOne()

    const Page = await this.accountPrivileges
      .createQueryBuilder('account_privileges')
      .innerJoinAndSelect('account_privileges.menu', 'menu')
      .where('account_privileges.account = :account', { account: id })
      .getMany()
    for (const a in Page) {
      data.access.push(Page[a].menu)
    }

    const Permission = await this.accountPermission
      .createQueryBuilder('account_permission')
      .innerJoinAndSelect('account_permission.permission', 'menu_permission')
      .where('account_permission.account = :account', { account: id })
      .getMany()
    for (const a in Permission) {
      data.permission.push(Permission[a].permission)
    }

    return data
  }

  async deleteSoft(id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(id)
    return await this.accountRepo
      .softDelete({ id })
      .then(async (returning) => {
        response.message = 'Account deleted successfully'
        response.statusCode = HttpStatus.OK
        response.payload = oldMeta
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async profileImageBuffer(id: string) {
    return readFileSync(join(process.cwd(), `./avatar/${id}.png`))
  }

  async edit(account, id: number): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.accountRepo
      .update(id, {
        email: account.email,
        first_name: account.first_name,
        last_name: account.last_name,
        authority: account.authority,
      })
      .then(async (returning) => {
        console.log(returning)
        const old = await this.accountRepo
          .createQueryBuilder('account')
          .innerJoinAndSelect('account.authority', 'authority')
          .where('account.id = :id', { id })
          .getOne()

        if (account.password !== undefined) {
          const saltOrRounds = 10
          const password = account.password
          account.password = await bcrypt.hash(password, saltOrRounds)
        }

        if (account.image_edit) {
          delete account.image_edit
          const logger = this.logger

          const buff = Buffer.from(
            await account.image.replace(/^data:image\/\w+;base64,/, ''),
            'base64'
          )
          const fs = require('fs')
          const path = `avatar/${id}.png`
          if (!fs.existsSync(path)) {
            fs.mkdirSync('avatar', { recursive: true })
          }

          fs.writeFile(path, buff, function (err) {
            // logger.log(account.image)
          })

          delete account.image
        }

        await this.dataSource
          .getRepository(AccountPrivilegesModel)
          .createQueryBuilder()
          .where('account = :account', { account: id })
          .softDelete()
          .execute()
          .then(() => {
            account.selectedPage.map(async (e) => {
              await this.grantAccess({ account: id, menu: e }, old)
            })
          })

        await this.dataSource
          .getRepository(AccountPermissionModel)
          .createQueryBuilder()
          .where('account = :account', { account: id })
          .softDelete()
          .execute()
          .then(() => {
            account.selectedPermission.map(async (e) => {
              await this.grantPermission({ account: id, permission: e }, old)
            })
          })

        response.message = 'Account updated successfully'
        response.statusCode = HttpStatus.OK
        response.table_target = 'account'
        response.method = 'PUT'
        response.action = 'U'
        response.transaction_id = id
        response.payload = old
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async add(account: AccountModel): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    // const saltOrRounds = 10
    // const password = account.password
    // account.password = await bcrypt.hash(password, saltOrRounds)
    return await this.accountRepo.save(account).then(async (returning) => {
      response.message = 'Account added successfully'
      response.statusCode = HttpStatus.OK
      response.payload = await this.detail(returning.id)
      return response
    })
  }

  async all() {
    return await this.accountRepo
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.authority', 'authority')
      .getMany()
  }

  async grantAccess(
    data: GrantAccessDTO,
    granted_by: AccountModel
  ): Promise<GlobalResponse> {
    let response = new GlobalResponse()

    return await this.dataSource
      .getRepository(AccountPrivilegesModel)
      .createQueryBuilder('account_privileges')
      .withDeleted()
      .where('account_privileges.account = :account', { account: data.account })
      .andWhere('account_privileges.menu = :menu', { menu: data.menu })
      .getOne()
      .then(async (returning) => {
        if (returning) {
          return await this.accountPrivileges
            .update(returning.id, {
              deleted_at: null,
            })
            .then((reactive) => {
              response.message = 'Access Granted Successfully'
              response.statusCode = HttpStatus.OK
              response.table_target = 'account_privileges'
              response.method = 'PUT'
              response.action = 'U'
              response.transaction_id = returning.id
              response.payload = returning
              return response
            })
            .catch((e: Error) => {
              throw new Error(e.message)
            })
        } else {
          const setPrivileges = new AccountPrivilegesModel({
            granted_by: granted_by,
            account: data.account,
            menu: data.menu,
          })
          return await this.accountPrivileges
            .save(setPrivileges)
            .then(async (reactive) => {
              response.message = 'Access Granted Successfully'
              response.statusCode = HttpStatus.OK
              response.table_target = 'account_privileges'
              response.method = 'PUT'
              response.action = 'I'
              response.transaction_id = returning.id
              response.payload = returning
              return response
            })
            .catch((e: Error) => {
              throw new Error(e.message)
            })
        }
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async grantPermission(
    data: GrantPermissionDTO,
    granted_by: AccountModel
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse()

    return await this.dataSource
      .getRepository(AccountPermissionModel)
      .createQueryBuilder('account_permission')
      .withDeleted()
      .where('account_permission.account = :account', { account: data.account })
      .andWhere('account_permission.permission = :permission', {
        permission: data.permission,
      })
      .getOne()
      .then(async (returning) => {
        if (returning) {
          return await this.accountPermission
            .update(returning.id, {
              deleted_at: null,
            })
            .then((reactive) => {
              response.message = 'Permission Granted Successfully'
              response.statusCode = HttpStatus.OK
              response.table_target = 'account_permission'
              response.method = 'PUT'
              response.action = 'U'
              response.transaction_id = returning.id
              response.payload = returning

              return response
            })
            .catch((e: Error) => {
              throw new Error(e.message)
            })
        } else {
          const setPermission = new AccountPermissionModel({
            granted_by: granted_by,
            account: data.account,
            permission: data.permission,
          })

          return await this.accountPermission
            .save(setPermission)
            .then(async (reactive) => {
              response.message = 'Permission Granted Successfully'
              response.statusCode = HttpStatus.OK
              response.table_target = 'account_permission'
              response.method = 'PUT'
              response.action = 'I'
              response.transaction_id = returning.id
              response.payload = returning
              return response
            })
            .catch((e: Error) => {
              throw new Error(e.message)
            })
        }
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async paginate(param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = await this.accountRepo.createQueryBuilder('account')

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value
        )
        rawTotalRecords.andWhere(`account.${b} ${filterSet.protocol} :a`, {
          a: filterSet.res,
        })
      }
    }

    const totalRecords = await rawTotalRecords.getMany()

    const dataRaw = this.accountRepo
      .createQueryBuilder('account')
      // .innerJoinAndSelect('account.authority', 'authority')
      .skip(param.first)
      .take(param.rows)
      .where('account.deleted_at IS NULL')
    // .andWhere('account.email ilike :email', { email: `%${param.filter.email.value}%` })

    if (param.sortField && param.sortField !== '') {
      dataRaw.orderBy(
        `account.${param.sortField}`,
        param.sortOrder > 0 ? 'ASC' : 'DESC'
      )
    } else {
      dataRaw.orderBy('account.created_at', 'DESC')
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(
          param.filter[b].matchMode,
          param.filter[b].value
        )
        dataRaw.andWhere(`account.${b} ${filterSet.protocol} :a`, {
          a: filterSet.res,
        })
      }
    }

    const data = await dataRaw.getMany()

    let autonum = parseInt(skip) + 1

    for (const a in data) {
      if (data[a]) {
        dataResult.push({
          autonum: autonum,
          id: data[a].id,
          email: data[a].email,
          first_name: data[a].first_name,
          last_name: data[a].last_name,
          created_at: data[a].created_at,
        })
        autonum++
      }
    }

    return {
      list: dataResult,
      totalRecords: totalRecords.length,
    }
  }
}
