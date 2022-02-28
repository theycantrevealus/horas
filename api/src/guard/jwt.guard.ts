import {
    ExecutionContext,
    HttpException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JWTTokenDecodeResponse, JWTTokenResponse } from '../auth/dto/jwt.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private readonly reflector: Reflector,
        private authService: AuthService
    ) {
        super();
    }
    handleRequest(err, account, info) {
        if (err || !account) {
            throw err || new UnauthorizedException();
        }
        return account;
    }

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const secured = this.reflector.get<string[]>(
            'secured',
            context.getHandler(),
        );

        if (!secured) {
            return true;
        }
        const request = context.switchToHttp().getRequest();

        if (!request.headers.authorization) {
            new UnauthorizedException();
            return false;
        }

        const decodeTokenResponse: JWTTokenResponse = await this.authService.validate_token({
            token: request.headers.authorization,
        });

        if (!decodeTokenResponse.user) {
            throw new HttpException(
                {
                    message: decodeTokenResponse.message,
                    data: null,
                    errors: null,
                },
                decodeTokenResponse.status,
            );
        }
        if (
            !decodeTokenResponse ||
            !decodeTokenResponse.token ||
            !decodeTokenResponse.user
        ) {
            throw new HttpException(
                {
                    message: decodeTokenResponse.message,
                    data: null,
                    errors: null,
                },
                decodeTokenResponse.status,
            );
        }

        return true;
    }
}
