import { AuthModule } from './auth/auth.module'
import { AuthService } from './auth/auth.service'
import { AccountModule } from './account/account.module'
import { AccountService } from './account/account.service'
import { AccountController } from './account/account.controller'
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthController } from './auth/auth.controller'
import { MenuModule } from './menu/menu.module'
import { LogModule } from './log/log.module';
import { LoginLogMiddleware } from './middleware/login.middleware'
import { ActivityLogMiddleware } from './middleware/activity.middleware'
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
export class AppModule implements NestModule {
  configure (consumer: MiddlewareConsumer) {
    consumer.apply(LoginLogMiddleware).forRoutes('login')
    consumer.apply(ActivityLogMiddleware).forRoutes({
      path: '*', method: RequestMethod.ALL
    })
  }
}
