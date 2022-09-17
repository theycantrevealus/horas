import { AuthController } from './auth.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { configService } from '../config/orm'
import 'dotenv/config'

import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtModule } from '@nestjs/jwt'
import { LogLoginModel } from '../model/log.login.model'

@Module({
    imports: [
        JwtModule.register({
            secret: `${process.env.JWT_SECRET}`
        })
    ],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService]
})
export class AuthModule { }
