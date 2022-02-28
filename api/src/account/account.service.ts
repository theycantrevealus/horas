import { Injectable } from '@nestjs/common';

import { AccountModel } from '../model/account.model';
import { AccountAuthorityModel } from '../model/account.authority.model';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountLoginDTO, AccountLoginResponseDTO } from './dto/account';
import { AccountAddDTO } from './dto/account.add.dto';

import { AccountAuthorityAddDTO } from './dto/account.authority.add.dto';
import { AuthService } from '../auth/auth.service';
@Injectable()
export class AccountService {
    constructor(
        @InjectRepository(AccountModel)
        private readonly accountRepo: Repository<AccountModel>,

        @InjectRepository(AccountAuthorityModel)
        private readonly accountAuthorityRepo: Repository<AccountAuthorityModel>,

        private readonly authService: AuthService
    ) { }

    async account_login(account: AccountLoginDTO) {
        let loginResp;
        const accountResp = await this.accountRepo.createQueryBuilder('account_authority')
            .where('deleted_at IS NULL')
            .orderBy('created_at', 'DESC')
            .andWhere('email = :email')
            .setParameters({ email: account.email })
            .getOne();
        if (accountResp) {
            const token = this.authService.create_token({
                uid: accountResp.uid
            });

            loginResp = {
                message: 'Logged In Successfully',
                user: accountResp,
                token: (await token).token
            };
        } else {
            loginResp.message = 'Login Failed';
        }

        return loginResp;
    }

    create_account(account: AccountAddDTO) {
        return this.accountRepo.save(account);
    }

    create_authority(authority: AccountAuthorityAddDTO) {
        return this.accountAuthorityRepo.save(authority);
    }
}
