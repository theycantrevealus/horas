import { Module } from '@nestjs/common'
import { MenuController } from './menu.controller'
import { MenuService } from './menu.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { configService } from '../config/orm'
import { MenuModel } from '../model/menu.model'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from '../auth/auth.service'
import { AccountPrivilegesModel } from '../model/account.privileges.model'

@Module({
  controllers: [MenuController],
  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([MenuModel, AccountPrivilegesModel], 'default')
  ],
  providers: [MenuService, AuthService],
  exports: [MenuService, AuthService]
})
export class MenuModule { }
