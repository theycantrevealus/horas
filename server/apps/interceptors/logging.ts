import { AccountService } from '@core/account/account.service'
import {
  AccountDocument,
  AccountModel,
} from '@core/account/schemas/account.model'
import { LogActivity, LogActivityDocument } from '@log/schemas/log.activity'
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AuthService } from '@security/auth.service'
import { Model } from 'mongoose'
import * as requestIp from 'request-ip'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Response<T> {
  data: T
}

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    @InjectModel(AccountModel.name)
    private accountModel: Model<AccountDocument>,

    @InjectModel(LogActivity.name)
    private logActivityModel: Model<LogActivityDocument>,

    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(AccountService)
    private readonly acccountService: AccountService
  ) {
    //
  }

  private logger = new Logger('HTTP')

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const http = context.switchToHttp()
    const request = await http.getRequest()
    const header_token = request.headers.authorization
    const ip = request.clientIp
      ? request.clientIp
      : requestIp.getClientIp(request)
    const { url } = request
    const token = header_token.split('Bearer')[1]
    const method = request.method
    const body = request.body !== '' ? request.body : '{}'
    const curr_date = new Date().toISOString().split('T')[0]
    const decoded = await this.authService.validate_token({
      token: token,
    })
    const account = await this.acccountService.detail(decoded.account.id)

    return next.handle().pipe(
      map(async (response) => {
        const transaction_classify =
          response && response.transaction_classify
            ? response.transaction_classify.toString()
            : 'UNDEFINED_TRANSACTION'

        const SLO_id =
          response && response.transaction_id ? response.transaction_id : ''

        body.__v += 1

        const newLogActivityRepo = new this.logActivityModel({
          account: account,
          collection_name: response.table_target,
          identifier: response.transaction_id,
          log_meta: `${transaction_classify}|${request.method}`,
          method: method,
          doc_v: body.__v && !isNaN(body.__v) ? body?.__v : 0,
          action: response.action,
          // old_meta: JSON.stringify(response.payload),
          // new_meta: JSON.stringify(body),
          old_meta: response.payload,
          new_meta: body,
        })

        await newLogActivityRepo.save()
        return response
      })
    )
  }
}
