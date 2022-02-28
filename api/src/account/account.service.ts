import { Injectable } from '@nestjs/common';

import { AccountModel } from '../model/account.model';
import { AccountAuthorityModel } from '../model/account.authority.model';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountLoginDTO } from './dto/account';
import { AccountAddDTO } from './dto/account.add.dto';

import { AccountAuthorityAddDTO } from './dto/account.authority.add.dto';
@Injectable()
export class AccountService {
    constructor(
        @InjectRepository(AccountModel)
        private readonly accountRepo: Repository<AccountModel>,

        @InjectRepository(AccountAuthorityModel)
        private readonly accountAuthorityRepo: Repository<AccountAuthorityModel>,
    ) { }

    async account_login(account: AccountLoginDTO) {
        return this.accountRepo.createQueryBuilder('account_authority')
            .where('deleted_at IS NULL')
            .orderBy('created_at', 'DESC')
            .andWhere('email = :email')
            .setParameters({ email: account.email })
            .getOne();
    }

    create_account(account: AccountAddDTO) {
        return this.accountRepo.save(account);
    }

    create_authority(authority: AccountAuthorityAddDTO) {
        return this.accountAuthorityRepo.save(authority);
    }
}
