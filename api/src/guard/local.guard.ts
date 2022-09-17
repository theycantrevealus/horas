import { Strategy } from 'passport-local'
import { PassportStrategy } from '@nestjs/passport'
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ExtractJwt } from 'passport-jwt'
import 'dotenv/config'
import { AuthService } from '../auth/auth.service'

@Injectable()
export class LocalGuard implements CanActivate {
    constructor(private authService: AuthService) { }
    private logger = new Logger('HTTP')

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const bearerToken = request.headers['authorization']
        const credential = await this.authService.validate_token({
            token: bearerToken
        })

        request.credential = credential.account
        return !!credential.account
    }
}