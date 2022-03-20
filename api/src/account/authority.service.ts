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
import { AccountAuthorityEditDTO, AccountAuthorityEditDTOResponse } from './dto/account.authority.edit.dto'

@Injectable()
export class AuthorityService {
    constructor(
        @InjectRepository(AccountModel)
        private readonly accountRepo: Repository<AccountModel>,

        @InjectRepository(AccountAuthorityModel)
        private readonly accountAuthorityRepo: Repository<AccountAuthorityModel>,

        private readonly authService: AuthService
    ) { }

    async detail (uid: string) {
        return await this.accountAuthorityRepo.findOne({
            where: {
                uid: uid
            }
        })
    }

    async edit (data: AccountAuthorityEditDTO) {
        let response = new AccountAuthorityEditDTOResponse()
        const authRes = this.accountAuthorityRepo.update(data.uid, data)
        if (authRes) {
            response.message = 'Authority updated succesfully'
            response.status = HttpStatus.OK
        } else {
            response.message = 'Authority failed to add'
            response.status = HttpStatus.BAD_REQUEST
        }
        return response
    }

    async delete_soft (uid: string) {
        let response = new AccountAuthorityDeleteDTOResponse()
        const proc = this.accountAuthorityRepo.softDelete(uid)
        if (proc) {
            response.message = 'Authority deleted successfully'
            response.status = HttpStatus.OK
        } else {
            response.message = 'Authority failed to delete'
            response.status = HttpStatus.BAD_REQUEST
        }
        return response
    }

    async delete_hard (uid: string) {
        let response = new AccountAuthorityDeleteDTOResponse()
        const proc = this.accountAuthorityRepo.delete(uid)
        if (proc) {
            response.message = 'Authority deleted successfully'
            response.status = HttpStatus.OK
        } else {
            response.message = 'Authority failed to delete'
            response.status = HttpStatus.BAD_REQUEST
        }
        return response
    }

    async all () {
        return await this.accountAuthorityRepo.find()
    }

    async add (data: AccountAuthorityAddDTO) {
        let response = new AccountAuthorityAddDTOResponse()
        const authRes = this.accountAuthorityRepo.save(data)
        if (authRes) {
            response.message = 'Authority added succesfully'
            response.status = HttpStatus.OK
        } else {
            response.message = 'Authority failed to add'
            response.status = HttpStatus.BAD_REQUEST
        }
        return response
    }
}