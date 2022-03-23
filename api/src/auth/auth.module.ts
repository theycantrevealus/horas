import { AuthController } from './auth.controller'
import 'dotenv/config'

import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtModule } from '@nestjs/jwt'

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
