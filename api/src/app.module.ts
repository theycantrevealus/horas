import { AuthorityController } from './authority/authority.controller';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AuthorityController, AppController],
  providers: [AppService],
})
export class AppModule {}
