
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Observable } from 'rxjs'
import { map, tap } from 'rxjs/operators'
import { idenClass } from '../mod.lib'
import { LogActivityModel } from '../model/log.activity.model'
import { Repository } from 'typeorm'

export interface Response<T> {
    data: T
}

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, Response<T>> {
    constructor(
        //@InjectRepository(LogActivityModel) private readonly logActivityRepo: Repository<LogActivityModel>
    ) { }
    intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest().body
        const reqParsed = JSON.stringify(req)

        return next
            .handle()
            .pipe(
                map(data => {
                    const resParsed = JSON.stringify(data)
                    return data
                })
            )
    }
}
