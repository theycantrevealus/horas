import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { AccountModule } from './account/account.module';
import { AccountService } from './account/account.service';
import { AccountController } from './account/account.controller';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [
    AuthModule,
    AccountModule
  ],
  controllers: [
    AccountController,
    AuthController,
    AppController
  ],
  providers: [
    AppService
  ],
})
export class AppModule { }
