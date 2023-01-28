import { Controller, Get } from '@nestjs/common'

import { LogService } from './log.service'

@Controller()
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  getHello(): string {
    return this.logService.getHello()
  }
}
