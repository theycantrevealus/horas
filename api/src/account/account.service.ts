import { HttpCode, HttpStatus, Injectable } from '@nestjs/common'
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
import { AccountAuthorityDeleteDTOResponse } from './dto/account.authority.delete.dto'
import { AccountEditDTO, AccountEditDTOResponse } from './dto/account.edit.dto'

@Injectable()
export class AccountService {
    constructor(
        @InjectRepository(AccountModel)
        private readonly accountRepo: Repository<AccountModel>,

        @InjectRepository(AccountAuthorityModel)
        private readonly accountAuthorityRepo: Repository<AccountAuthorityModel>,

        private readonly authService: AuthService
    ) { }

    async login (account: AccountLoginDTO) {
        let loginResp = new AccountLoginResponseDTO()
        const accountResp = await this.accountRepo.createQueryBuilder('account')
            .where('deleted_at IS NULL')
            .orderBy('created_at', 'DESC')
            .andWhere('email = :email')
            .setParameters({ email: account.email })
            .getOne()

        if (accountResp) {
            const token = this.authService.create_token({
                uid: accountResp.uid
            })

            loginResp.message = 'Logged In Successfully'
            loginResp.user = accountResp
            loginResp.token = (await token).token
            loginResp.status = HttpStatus.OK
        } else {
            loginResp.message = 'Login Failed'
            loginResp.user = accountResp
            loginResp.token = ''
            loginResp.status = HttpStatus.BAD_REQUEST
        }

        return loginResp
    }

    async detail (uid: string) {
        return this.accountRepo.createQueryBuilder('account').innerJoinAndSelect('account.authority', 'authority').where('account.uid = :uid', { uid }).getOne()
    }

    async edit (account: AccountEditDTO) {
        let response = new AccountEditDTOResponse()
        const saltOrRounds = 10;
        const password = account.password
        account.password = await bcrypt.hash(password, saltOrRounds)
        const accountRes = this.accountRepo.update(account.uid, account)
        if (accountRes) {
            response.message = 'Account updated successfully'
            response.status = HttpStatus.OK
        } else {
            response.message = 'Account failed to update'
            response.status = HttpStatus.BAD_REQUEST
        }
        return response
    }

    async add (account: AccountAddDTO) {
        let response = new AccountAddDTOResponse()
        const saltOrRounds = 10;
        const password = account.password
        account.password = await bcrypt.hash(password, saltOrRounds)
        const accountRes = this.accountRepo.save(account)
        if (accountRes) {
            response.message = 'Account added successfully'
            response.status = HttpStatus.OK
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
