import { Module } from '@nestjs/common'
import { MenuController } from './menu.controller'
import { MenuService } from './menu.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { configService } from '../config/orm'
import { MenuModel } from '../model/menu.model'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from '../auth/auth.service'
import { AccountPrivilegesModel } from '../model/account.privileges.model'
import { LogActivityModel } from '../model/log.activity.model'
import { MenuGroupController } from './menu.group.controller'
import { MenuGroupModel } from '../model/menu.group.model'
import { MenuGroupService } from './menu.group.service'

@Module({
  controllers: [MenuController, MenuGroupController],
  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([MenuModel, AccountPrivilegesModel, LogActivityModel, MenuGroupModel], 'default')
  ],
  providers: [MenuService, MenuGroupService, AuthService],
  exports: [MenuService, MenuGroupService, AuthService]
})
export class MenuModule { }
