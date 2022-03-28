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

@Injectable()
export class AccountService {
    constructor(
        @InjectRepository(AccountModel)
        private readonly accountRepo: Repository<AccountModel>,

        @InjectRepository(LogLoginModel)
        private readonly logLoginRepo: Repository<LogLoginModel>,

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

            loginResp.message = 'Logged In Successfully'
            loginResp.account = accountResp
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
        const accountTarget = await this.accountRepo.findOne({ where: { uid: data.account } })
        return await this.menuService.grant_menu_access({ account: accountTarget, menu: data.menu, granted_by: granted_by })
    }

    async detail (uid: string) {
        return this.accountRepo.createQueryBuilder('account').innerJoinAndSelect('account.authority', 'authority').where('account.uid = :uid', { uid }).getOne()
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
        const saltOrRounds = 10
        const password = account.password
        account.password = await bcrypt.hash(password, saltOrRounds)
        const accountRes = this.accountRepo.update(uid, account).then(async returning => {
            return await this.detail(uid)
        })
        if (accountRes) {
            response.message = 'Account updated successfully'
            response.status = HttpStatus.OK
            response.returning = await accountRes
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
}
