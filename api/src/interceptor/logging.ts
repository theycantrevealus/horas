
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
        // @InjectRepository(LogActivityModel)
        // private readonly logActivityRepo: Repository<LogActivityModel>,

        private readonly authService: AuthService,
        private readonly accountService: AccountService
    ) { }

    private logger = new Logger('HTTP')

    async intercept (context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {

        const http = context.switchToHttp()
        const request = http.getRequest()
        const auth = request.header.authorization
        const method = request.method
        const body = request.body
        // const requestParsed = JSON.stringify(request.body)
        // const { url, method } = request.raw
        // const { params, query, body, headers, user } = request
        // this.logger.log('url : ', url)
        // this.logger.log('method : ', method)
        // this.logger.log('params : ', params)
        // this.logger.log('query : ', query)
        // this.logger.log('body : ', body)
        // this.logger.log('headers : ', headers)

        //this.logActivityRepo.save()
        let logDataModel = new LogActivityAddDTO()
        if (auth != undefined) {
            const userUID: JWTTokenResponse = await this.authService.validate_token({
                token: auth
            })

            //const account = await this.accountService.detail(userUID.user)
            this.logger.log(request.header.authorization)
        }

        // const requestClassification: any = {
        //     'PUT': 'U',
        //     'POST': 'I',
        //     'DELETE': 'D'
        // }

        // logDataModel.account = account
        // logDataModel.action = requestClassification[method]
        // logDataModel.log_meta = ''
        // logDataModel.old_meta = ''
        // logDataModel.new_meta = JSON.stringify(body)
        // logDataModel.table_identifier = ''
        // logDataModel.table_target = ''


        if (method == 'PUT' || method == 'DELETE') {
            const idenID = colCodeName[body.id]
        } else if (method == 'POST') {
            //
        } else {
            //
        }

        return next
            .handle()
            .pipe(
                map(data => {
                    const responseParsed = JSON.stringify(data)
                    return data
                })
            )
    }
}
