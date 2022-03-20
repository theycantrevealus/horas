import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AuthorityController } from './authority.controller';
import { AccountService } from './account.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configService } from '../config/orm';
import { AccountModel } from '../model/account.model';
import { AccountAuthorityModel } from '../model/account.authority.model';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthorityService } from './authority.service';

@Module({
    imports: [
        JwtModule.register({
            secret: `${process.env.JWT_SECRET}`
        }),
        TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
        TypeOrmModule.forFeature([AccountAuthorityModel, AccountModel], 'default')
    ],
    controllers: [AccountController, AuthorityController],
    providers: [AccountService, AuthorityService, AuthService],
    exports: [AccountService, AuthorityService]
})
export class AccountModule { }
