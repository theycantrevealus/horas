import { AuthModule } from './auth/auth.module'
import { AccountModule } from './account/account.module'
import { AccountController } from './account/account.controller'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthController } from './auth/auth.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MenuModule } from './menu/menu.module'
import { configService } from './config/orm'
import { LogModule } from './log/log.module'
import { MenuController } from './menu/menu.controller'
import { LogController } from './log/log.controller'
import { LogService } from './log/log.service'
import { LoggingInterceptor } from './interceptor/logging'
import { JwtModule } from '@nestjs/jwt'
import { AccountModel } from './model/account.model'
import { LogActivityModel } from './model/log.activity.model'
import { AccountService } from './account/account.service'
import { LogLoginModel } from './model/log.login.model'

@Module({
  imports: [
    AuthModule,
    AccountModule,
    MenuModule,
    LogModule,
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([LogLoginModel], 'default')
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
