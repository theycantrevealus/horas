import { AuthModule } from './auth/auth.module'
import { AccountModule } from './account/account.module'
import { AccountController } from './account/account.controller'
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthController } from './auth/auth.controller'
import { MenuModule } from './menu/menu.module'
import { LogModule } from './log/log.module';
import { MenuController } from './menu/menu.controller'
import { LogController } from './log/log.controller'

@Module({
  imports: [
    AuthModule,
    AccountModule,
    MenuModule,
    LogModule
  ],
  controllers: [
    AccountController,
    MenuController,
    LogController,
    AuthController,
    AppController
  ],
  providers: [
    AppService
  ],
})
export class AppModule { }
