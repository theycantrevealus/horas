import { Controller, Get, Version } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'

import { CoreService } from './core.service'

@Controller()
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Get()
  @Version('1')
  @ApiProperty({ description: 'Test' })
  getHello(): string {
    return this.coreService.getHello()
  }
}
