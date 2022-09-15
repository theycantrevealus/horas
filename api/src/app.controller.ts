import { Controller, Get, Param, Res } from '@nestjs/common'
import { UseInterceptors } from '@nestjs/common'
import { SentryInterceptor } from './interceptor/sentry'
import { AppService } from './app.service'

@UseInterceptors(SentryInterceptor)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }
}
