import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { configService } from '../config/orm';
import { MenuModel } from '../model/menu.model';

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
