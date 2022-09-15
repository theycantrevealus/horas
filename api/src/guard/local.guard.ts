import { AuthService } from '@/auth/auth.service'
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common'
import 'dotenv/config'

@Injectable()
export class LocalGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  private logger = new Logger('HTTP')

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const bearerToken = request.headers['authorization']
    const credential = await this.authService.validate_token({
      token: bearerToken,
    })

    request.credential = credential.account
    return !!credential.account
  }
}
