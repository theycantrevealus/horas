import { Module } from '@nestjs/common'
import { LicenseController } from './license.controller'
import { LicenseService } from './license.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { configService } from '../config/orm'
import { AuthService } from '../auth/auth.service'
import { JwtModule } from '@nestjs/jwt'
import { LogActivityModel } from '../model/log.activity.model'
import { LogLoginModel } from '../model/log.login.model'
import { LicenseModel } from '../model/license.model'

@Module({
  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([LicenseModel, LogActivityModel, LogLoginModel], 'default')
  ],
  controllers: [LicenseController],
  providers: [LicenseService, AuthService],
  exports: [LicenseService]
})
export class LicenseModule { }
