import 'dotenv/config'

import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'

import { AuthService } from './auth.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<JwtModuleOptions> => {
        const expiresIn = 30 * 24 * 60 * 60
        return {
          secret: configService.get<string>('application.jwt'),
          signOptions: {
            expiresIn: expiresIn,
          },
        }
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
