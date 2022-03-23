import { Module } from '@nestjs/common'
import { MenuController } from './menu.controller'
import { MenuService } from './menu.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { configService } from '../config/orm'
import { MenuModel } from '../model/menu.model'
import { JwtModule } from '@nestjs/jwt'

@Module({
  controllers: [MenuController],
  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([MenuModel], 'default')
  ],
  providers: [MenuService],
  exports: [MenuService]
})
export class MenuModule { }
