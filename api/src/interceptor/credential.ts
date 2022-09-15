import { AuthService } from '@/auth/auth.service'
import { JWTTokenResponse } from '@/auth/dto/jwt.dto'
import { LogActivityModel } from '@/model/log.activity.model'
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Repository } from 'typeorm'

export interface Response<T> {
  data: T
}

@Injectable()
export class CredentialInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(
    @InjectRepository(LogActivityModel)
    private readonly logActivityRepo: Repository<LogActivityModel>,

    private readonly authService: AuthService,
  ) {}

  private logger = new Logger('HTTP')

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const http = context.switchToHttp()
    const request = http.getRequest()
    const { url } = request
    const auth = request.headers['authorization']
    const method = request.method
    const body = request.body

    const requestClassification: any = {
      PUT: 'U',
      POST: 'I',
      DELETE: 'D',
    }

    return next.handle().pipe(
      map(async (response) => {
        const responseParsed = JSON.stringify(response)
        if (auth != undefined) {
          const userUID: JWTTokenResponse =
            await this.authService.validate_token({
              token: auth,
            })
          const account = userUID.account
          if (!request.headers['credential']) {
            request.headers['credential'] = account
          }
        }

        return response
      }),
    )
  }
}
