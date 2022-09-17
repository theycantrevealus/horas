import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import * as requestIp from 'request-ip'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { AccountService } from '@/account/account.service'
import { CoreLogActivityModel } from '@models/core.logging.activity.model'
import { InjectRepository } from '@nestjs/typeorm'
import { AccountModel } from '@/models/account.model'
import { Repository } from 'typeorm'
import { gen_uuid } from '@/utilities/mod.lib'
import { AuthService } from '@/auth/auth.service'
import { throws } from 'assert'

export interface Response<T> {
  data: T
}

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    @InjectRepository(AccountModel)
    private readonly accountRepo: Repository<AccountModel>,

    @InjectRepository(CoreLogActivityModel)
    private readonly coreLogActivityRepo: Repository<CoreLogActivityModel>,

    private authService: AuthService,
    private acccountService: AccountService
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
    const token = header_token.split(' ')[1]
    const method = request.method
    const body = request.body !== '' ? request.body : '{}'
    let curr_date = new Date().toISOString().split('T')[0]
    const decoded = await this.authService.validate_token(token)
    const account = await this.acccountService.detail(decoded.account)

    return next.handle().pipe(
      map(async (response) => {
        const transaction_classify =
          response && response.transaction_classify
            ? response.transaction_classify.toString()
            : 'UNDEFINED_TRANSACTION'

        const SLO_id =
          response && response.transaction_id
            ? response.transaction_id
            : gen_uuid()

        curr_date = new Date().toISOString().split('T')[0]
        const SLO_tracing_id = `SLO_${curr_date}_${SLO_id.toString()}`
        const newLogActivityRepo = new CoreLogActivityModel({
          account: account,
          table_target: response.table_target,
          table_identifier:
            parseInt(response.transaction_id) > 0
              ? response.transaction_id
              : response.transaction_id,
          log_meta: `${transaction_classify}|${response.method}`,
          action: response.action,
          old_meta: JSON.stringify(body),
          new_meta: JSON.stringify(response),
        })

        await this.coreLogActivityRepo.save(newLogActivityRepo)
        return response
      })
    )
  }
}
