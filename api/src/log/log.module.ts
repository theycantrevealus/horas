import { Module } from '@nestjs/common';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configService } from '../config/orm';
import { LogLoginModel } from '../model/log.login.model';
import { LogActivityModel } from '../model/log.activity.model';

@Module({
  controllers: [LogController],
  providers: [LogService],

  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([LogLoginModel, LogActivityModel], 'default')
  ],
  exports: [LogService]
})
export class LogModule { }
