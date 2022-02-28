import { AccountModule } from './account/account.module';
import { AccountService } from './account/account.service';
import { AccountController } from './account/account.controller';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AccountModule],
  controllers: [AccountController, AppController],
  providers: [AppService],
})
export class AppModule { }
