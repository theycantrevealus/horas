import { HttpCode, HttpStatus, Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AccountModel } from '../model/account.model'
import { AccountAuthorityModel } from '../model/account.authority.model'

import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AccountLoginDTO, AccountLoginResponseDTO } from './dto/account'
import { AccountAddDTO, AccountAddDTOResponse } from './dto/account.add.dto'

import { AccountAuthorityAddDTO, AccountAuthorityAddDTOResponse } from './dto/account.authority.add.dto'
import { AuthService } from '../auth/auth.service'
import { Http } from '@sentry/node/dist/integrations'
import { AccountDeleteDTOResponse } from './dto/account.delete.dto'
import { AccountEditDTO, AccountEditDTOResponse } from './dto/account.edit.dto'
import { AuthorityService } from './authority.service'
import { LogLoginModel } from '../model/log.login.model'
import { LogLoginDTO } from '../auth/dto/log.login.dto'
import { MenuService } from '../menu/menu.service'
import { AccountPrivilegesModel } from '../model/account.privileges.model'
import { AccountPermissionModel } from '../model/account.permission.model'
import { filterSetDT } from '../mod.lib'
import { fstat } from 'fs'
import { logger } from '@sentry/utils'

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(AccountModel)
    private readonly accountRepo: Repository<AccountModel>,

    @InjectRepository(LogLoginModel)
    private readonly logLoginRepo: Repository<LogLoginModel>,

    @InjectRepository(AccountPrivilegesModel)
    private readonly accountPrivileges: Repository<AccountPrivilegesModel>,

    @InjectRepository(AccountPermissionModel)
    private readonly accountPermission: Repository<AccountPermissionModel>,

    private readonly authService: AuthService,
    private readonly menuService: MenuService


  ) { }

  private logger = new Logger('HTTP')

  async login (account: AccountLoginDTO) {
    let loginResp = new AccountLoginResponseDTO()

    const accountResp = await this.accountRepo.createQueryBuilder('account')
      .where('deleted_at IS NULL')
      .orderBy('created_at', 'DESC')
      .andWhere('email = :email')
      .setParameters({ email: account.email })
      .getOne()

    if (accountResp) {

      //Load Permission

      const token = this.authService.create_token({
        uid: accountResp.uid,
        email: accountResp.email,
        first_name: accountResp.first_name,
        last_name: accountResp.last_name
      })

      const tokenSet = (await token).token


      //LOAD PAGE PERMISSION
      const grantedPageSet = []
      const Page = await this.accountPrivileges.createQueryBuilder('account_privileges')
        .innerJoinAndSelect('account_privileges.menu', 'menu')
        .where('account_privileges.account = :account', { account: accountResp.uid })
        .getMany()
      for (const a in Page) {
        grantedPageSet.push(Page[a].menu)
      }

      //LOAD ACCESS PERMISSION
      const grantedPermSet = []
      const Permission = await this.accountPermission.createQueryBuilder('account_permission')
        .innerJoinAndSelect('account_permission.permission', 'menu_permission')
        .where('account_permission.account = :account', { account: accountResp.uid })
        .getMany()
      for (const a in Permission) {
        grantedPermSet.push(Permission[a].permission)
      }

      loginResp.message = 'Logged In Successfully'
      loginResp.account = accountResp
      loginResp.account.grantedPerm = grantedPermSet
      loginResp.account.grantedPage = grantedPageSet
      loginResp.token = tokenSet
      loginResp.status = HttpStatus.OK


      //Log login
      const loginData: LogLoginDTO = {
        account: accountResp.uid,
        log_meta: '',
        token: tokenSet
      }
      const logLogin = await this.logLoginRepo.save(loginData)

    } else {
      loginResp.message = 'Login Failed'
      loginResp.account = accountResp
      loginResp.token = ''
      loginResp.status = HttpStatus.BAD_REQUEST
    }

    return loginResp
  }

  async grant_access (data: any, granted_by: any) {
    return await this.menuService.grant_menu_access({ account: data.account, menu: data.menu, granted_by: granted_by })
  }

  async grant_permission (data: any, granted_by: any) {
    return await this.menuService.grant_menu_permission({ account: data.account, permission: data.permission, granted_by: granted_by })
  }

  async detail (uid: string) {
    let data = {
      account: {},
      access: [],
      permission: []
    }
    data.account = await this.accountRepo.createQueryBuilder('account').innerJoinAndSelect('account.authority', 'authority').where('account.uid = :uid', { uid }).getOne()
    //LOAD PAGE PERMISSION
    const Page = await this.accountPrivileges.createQueryBuilder('account_privileges')
      .innerJoinAndSelect('account_privileges.menu', 'menu')
      .where('account_privileges.account = :account', { account: uid })
      .getMany()
    for (const a in Page) {
      data.access.push(Page[a].menu)
    }

    //LOAD ACCESS PERMISSION
    const Permission = await this.accountPermission.createQueryBuilder('account_permission')
      .innerJoinAndSelect('account_permission.permission', 'menu_permission')
      .where('account_permission.account = :account', { account: uid })
      .getMany()
    for (const a in Permission) {
      data.permission.push(Permission[a].permission)
    }

    return data
  }

  async delete_soft (uid: string) {
    let response = new AccountDeleteDTOResponse()
    const oldMeta = await this.detail(uid)
    var accountRes = this.accountRepo.softDelete({ uid })
    if (accountRes) {
      response.message = 'Account deleted successfully'
      response.status = HttpStatus.OK
      response.returning = oldMeta
    } else {
      response.message = 'Account failed to delete'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async edit (account, uid: string) {
    let response = new AccountEditDTOResponse()
    if (account.password !== undefined) {
      const saltOrRounds = 10
      const password = account.password
      account.password = await bcrypt.hash(password, saltOrRounds)
    }


    if (account.image_edit) {
      delete account.image_edit
      const logger = this.logger

      var buff = Buffer.from(await account.image.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      const fs = require('fs')
      const path = `avatar/${uid}.png`
      if (!fs.existsSync(path)) {
        fs.mkdirSync('avatar', { recursive: true });
      }

      fs.writeFile(path, buff, function (err) {
        // logger.log(account.image)
      })

      delete account.image
    }

    const resetPrivileges = await this.accountPrivileges.createQueryBuilder('account_privileges').where({
      account: uid
    }).getMany()

    for (const a in resetPrivileges) {
      const setResetPriv = await this.accountPrivileges.softDelete({ id: resetPrivileges[a].id })
    }

    const resetPermission = await this.accountPermission.createQueryBuilder('account_permission').where({
      account: uid
    }).getMany()

    for (const a in resetPermission) {
      const setResetPerm = await this.accountPermission.softDelete({ id: resetPermission[a].id })
    }

    const accountRes = this.accountRepo.update(uid, {
      email: account.email,
      first_name: account.first_name,
      last_name: account.last_name,
      authority: account.authority
    }).then(async returning => {
      return await this.detail(uid)
    })
    if (accountRes) {
      response.message = 'Account updated successfully'
      response.status = HttpStatus.OK
      response.returning = await (await accountRes).account
    } else {
      response.message = 'Account failed to update'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async add (account: AccountAddDTO) {
    let response = new AccountAddDTOResponse()
    const saltOrRounds = 10
    const password = account.password
    account.password = await bcrypt.hash(password, saltOrRounds)
    const accountRes = this.accountRepo.save(account).then(async returning => {
      return await this.detail(returning.uid)
    })
    if (accountRes) {
      response.message = 'Account added successfully'
      response.status = HttpStatus.OK
      response.returning = await accountRes
    } else {
      response.message = 'Account failed to add'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }

  async all () {
    return await this.accountRepo.createQueryBuilder('account').innerJoinAndSelect('account.authority', 'authority').getMany()
  }

  async paginate (param: any) {
    const take = param.rows || 20
    const skip = param.first || 0
    const dataResult = []

    const rawTotalRecords = await this.accountRepo.createQueryBuilder('account')

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(param.filter[b].matchMode, param.filter[b].value)
        rawTotalRecords.andWhere(`account.${b} ${filterSet.protocol} :a`, { a: filterSet.res })
      }
    }

    const totalRecords = await rawTotalRecords.getMany();


    const dataRaw = this.accountRepo.createQueryBuilder('account')
      // .innerJoinAndSelect('account.authority', 'authority')
      .skip(param.first)
      .take(param.rows)
      .where('account.deleted_at IS NULL')
    // .andWhere('account.email ilike :email', { email: `%${param.filter.email.value}%` })


    if (param.sortField && param.sortField !== '') {
      dataRaw.orderBy(`account.${param.sortField}`, ((param.sortOrder > 0) ? 'ASC' : 'DESC'))
    } else {
      dataRaw.orderBy('account.created_at', 'DESC')
    }

    for (const b in param.filter) {
      if (param.filter[b].value !== '') {
        const filterSet: any = filterSetDT(param.filter[b].matchMode, param.filter[b].value)
        dataRaw.andWhere(`account.${b} ${filterSet.protocol} :a`, { a: filterSet.res })
      }
    }

    const data = await dataRaw.getMany()

    let autonum = parseInt(skip) + 1

    for (const a in data) {

      if (data[a]) {
        dataResult.push({
          autonum: autonum,
          uid: data[a].uid,
          email: data[a].email,
          first_name: data[a].first_name,
          last_name: data[a].last_name,
          created_at: data[a].created_at
        })
        autonum++
      }
    }

    return {
      list: dataResult,
      totalRecords: totalRecords.length
    }
  }
}
