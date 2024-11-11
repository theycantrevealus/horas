import { Authorization } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Controller,
  Get,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'

import { GatewayQueueService } from './gateway_queue.service'

@Controller('queue')
@ApiTags('Queue Management')
export class GatewayQueueController {
  constructor(private readonly gatewayQueueService: GatewayQueueService) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Queue', action: 'machine' })
  @ApiOperation({
    summary: 'Fetch all available machine',
    description: 'Showing all avail queue machine',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async queueMachineAll(): Promise<GlobalResponse> {
    return await this.gatewayQueueService.queueMachineAvail()
  }
}
