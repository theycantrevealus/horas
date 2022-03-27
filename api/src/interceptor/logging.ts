
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Observable } from 'rxjs'
import { map, tap } from 'rxjs/operators'
import { idenClass } from '../mod.lib'
import { LogActivityModel } from '../model/log.activity.model'
import { Repository } from 'typeorm'
import { colCodeName } from '../mod.lib'
import { LogActivityAddDTO } from './dto/log.activity.add.dto'
import { AuthService } from '../auth/auth.service'
import { AccountModel } from '../model/account.model'
import { JWTTokenDecodeResponse, JWTTokenResponse } from 'dist/auth/dto/jwt.dto'
import { use } from 'passport'
import { AccountService } from '../account/account.service'

export interface Response<T> {
    data: T
}

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, Response<T>> {
    constructor(
        @InjectRepository(LogActivityModel)
        private readonly logActivityRepo: Repository<LogActivityModel>,

        private readonly authService: AuthService,
        private readonly accountService: AccountService
    ) { }

    private logger = new Logger('HTTP')

    async intercept (context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {

        const http = context.switchToHttp()
        const request = http.getRequest()
        const { url } = request
        const auth = request.headers['authorization']
        const method = request.method
        const body = request.body

        const requestClassification: any = {
            'PUT': 'U',
            'POST': 'I',
            'DELETE': 'D'
        }

        return next
            .handle()
            .pipe(
                map(async response => {
                    const responseParsed = JSON.stringify(response)
                    if (auth != undefined) {
                        const userUID: JWTTokenResponse = await this.authService.validate_token({
                            token: auth
                        })

                        const account = await this.accountService.detail(userUID.user)

                        const logDataModel: LogActivityAddDTO = {
                            account: account,
                            action: requestClassification[method],
                            log_meta: '',
                            old_meta: (response.returning != undefined) ? response.returning : '',
                            new_meta: JSON.stringify(body),
                            table_identifier: (response.returning != undefined) ? response.returning.uid : '',
                            table_target: url,
                        }

                        this.logActivityRepo.save(logDataModel)
                    }
                    return response
                })
            )
    }
}
