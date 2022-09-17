import { ServeStaticModule } from '@nestjs/serve-static'
import { AuthModule } from './auth/auth.module'
import { AccountModule } from './account/account.module'
import { AccountController } from './account/account.controller'
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthController } from './auth/auth.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MenuModule } from './menu/menu.module'
import { configService } from './config/orm'
import { LogModule } from './log/log.module'
import { MenuController } from './menu/menu.controller'
import { LogController } from './log/log.controller'
import { LogActivityModel } from './model/log.activity.model'
import { LogLoginModel } from './model/log.login.model'
import { join } from 'path'
import { LicenseModule } from './license/license.module'
import { LicenseController } from './license/license.controller'
import { MasterItemModule } from './master/item/master.item.module'
import { MasterItemController } from './master/item/master.item.controller'

@Module({
  imports: [
    AuthModule,
    MasterItemModule,
    AccountModule,
    MenuModule,
    LogModule,
    LicenseModule,
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([LogLoginModel, LogActivityModel], 'default'),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'avatar'),
      exclude: ['/api*'],
      serveRoot: '/avatar',
    }),
  ],
  controllers: [
    AccountController,
    MasterItemController,
    MenuController,
    LogController,
    AuthController,
    LicenseController,
    AppController,
  ],
  providers: [AppService],
})
export class AppModule {}
