import { AuthService } from '@/auth/auth.service'
import { configService } from '@/config/orm'
import { AccountAuthorityModel } from '@/model/account.authority.model'
import { AccountModel } from '@/model/account.model'
import { AccountPermissionModel } from '@/model/account.permission.model'
import { AccountPrivilegesModel } from '@/model/account.privileges.model'
import { LogActivityModel } from '@/model/log.activity.model'
import { LogLoginModel } from '@/model/log.login.model'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccountController } from './account.controller'
import { AccountService } from './account.service'

@Module({
  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`,
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature(
      [
        AccountAuthorityModel,
        AccountPrivilegesModel,
        AccountPermissionModel,
        AccountModel,
        LogActivityModel,
        LogLoginModel,
      ],
      'default',
    ),
  ],
  controllers: [AccountController],
  providers: [AccountService, AuthService],
  exports: [AccountService],
})
export class AccountModule {}
