import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuthService } from '../auth/auth.service'
import { filterSetDT } from '@utilities/mod.lib'
import { AccountModel } from '@/models/account.model'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { AccountPermissionModel } from '@/models/account.permission.model'
import {
  AccountLoginDTO,
  AccountLoginResponseDTO,
} from '@/account/dtos/account.login.dto'

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(AccountModel)
    private readonly accountRepo: Repository<AccountModel>,

    @InjectRepository(AccountPrivilegesModel)
    private readonly accountPrivileges: Repository<AccountPrivilegesModel>,

    @InjectRepository(AccountPermissionModel)
    private readonly accountPermission: Repository<AccountPermissionModel>,

    private readonly authService: AuthService
  ) {}

  private logger = new Logger('HTTP')

  async login(account: AccountLoginDTO) {
    const loginResp = new AccountLoginResponseDTO()

    const accountResp = await this.accountRepo
      .createQueryBuilder('account')
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
        last_name: accountResp.last_name,
      })

      const tokenSet = (await token).token

      //LOAD PAGE PERMISSION
      const grantedPageSet = []
      const Page = await this.accountPrivileges
        .createQueryBuilder('account_privileges')
        .innerJoinAndSelect('account_privileges.menu', 'menu')
        .where('account_privileges.account = :account', {
          account: accountResp.uid,
        })
        .getMany()
      for (const a in Page) {
        grantedPageSet.push(Page[a].menu)
      }

      //LOAD ACCESS PERMISSION
      const grantedPermSet = []
      const Permission = await this.accountPermission
        .createQueryBuilder('account_permission')
        .innerJoinAndSelect('account_permission.permission', 'menu_permission')
        .where('account_permission.account = :account', {
          account: accountResp.uid,
        })
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
    } else {
      loginResp.message = 'Login Failed'
      loginResp.account = accountResp
      loginResp.token = ''
      loginResp.status = HttpStatus.BAD_REQUEST
    }

    return loginResp
  }

  async detail(uid: string) {
    const data = {
      account: {},
      access: [],
      permission: [],
    }
    data.account = await this.accountRepo
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.authority', 'authority')
      .where('account.uid = :uid', { uid })
      .getOne()
    //LOAD PAGE PERMISSION
    const Page = await this.accountPrivileges
      .createQueryBuilder('account_privileges')
      .innerJoinAndSelect('account_privileges.menu', 'menu')
      .where('account_privileges.account = :account', { account: uid })
      .getMany()
    for (const a in Page) {
      data.access.push(Page[a].menu)
    }

    //LOAD ACCESS PERMISSION
    const Permission = await this.accountPermission
      .createQueryBuilder('account_permission')
      .innerJoinAndSelect('account_permission.permission', 'menu_permission')
      .where('account_permission.account = :account', { account: uid })
      .getMany()
    for (const a in Permission) {
      data.permission.push(Permission[a].permission)
    }

    return data
  }

  async delete_soft(uid: string): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const oldMeta = await this.detail(uid)
    return await this.accountRepo
      .softDelete({ uid })
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

  async edit(account, uid: string): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    return await this.accountRepo
      .update(uid, {
        email: account.email,
        first_name: account.first_name,
        last_name: account.last_name,
        authority: account.authority,
      })
      .then(async (returning) => {
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
          const path = `avatar/${uid}.png`
          if (!fs.existsSync(path)) {
            fs.mkdirSync('avatar', { recursive: true })
          }

          fs.writeFile(path, buff, function (err) {
            // logger.log(account.image)
          })

          delete account.image
        }

        const resetPrivileges = await this.accountPrivileges
          .createQueryBuilder('account_privileges')
          .where({
            account: uid,
          })
          .getMany()

        for (const a in resetPrivileges) {
          const setResetPriv = await this.accountPrivileges.softDelete({
            id: resetPrivileges[a].id,
          })
        }

        const resetPermission = await this.accountPermission
          .createQueryBuilder('account_permission')
          .where({
            account: uid,
          })
          .getMany()

        for (const a in resetPermission) {
          const setResetPerm = await this.accountPermission.softDelete({
            id: resetPermission[a].id,
          })
        }

        response.message = 'Account updated successfully'
        response.statusCode = HttpStatus.OK
        response.payload = await this.detail(uid)
        return response
      })
      .catch((e: Error) => {
        throw new Error(e.message)
      })
  }

  async add(account: AccountModel): Promise<GlobalResponse> {
    const response = new GlobalResponse()
    const saltOrRounds = 10
    const password = account.password
    account.password = await bcrypt.hash(password, saltOrRounds)
    return await this.accountRepo.save(account).then(async (returning) => {
      response.message = 'Account added successfully'
      response.statusCode = HttpStatus.OK
      response.payload = await this.detail(returning.uid)
      return response
    })
  }

  async all() {
    return await this.accountRepo
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.authority', 'authority')
      .getMany()
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
          uid: data[a].uid,
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
