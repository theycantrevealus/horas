import 'dotenv/config'

import { Module } from '@nestjs/common'
import { AuthService } from '@/auth/auth.service'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CoreLogActivityModel } from '@/models/core.logging.activity.model'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccountModel } from '@/models/account.model'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('application.jwt'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(
      [AccountModel, CoreLogLoginModel, CoreLogActivityModel],
      'default'
    ),
  ],
  controllers: [],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
