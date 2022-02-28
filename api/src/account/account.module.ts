import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configService } from '../config/orm';
import { AccountModel } from '../model/account.model';
import { AccountAuthorityModel } from '../model/account.authority.model';

@Module({
    imports: [
        TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
        TypeOrmModule.forFeature([AccountAuthorityModel, AccountModel], 'default'),
    ],
    controllers: [AccountController],
    providers: [AccountService],
    exports: [AccountService]
})
export class AccountModule { }
