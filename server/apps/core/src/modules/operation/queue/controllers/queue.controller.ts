import { QueueAddDTO } from '@core/operation/queue/dto/queue'
import { OperationQueueService } from '@core/operation/queue/services/operation-queue.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyRequest } from 'fastify'

@Controller('queue')
@ApiTags('Frontdesk')
export class OperationQueueController {
  constructor(
    @Inject(OperationQueueService)
    private readonly operationQueueService: OperationQueueService
  ) {}
  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new queue',
    description: ``,
  })
  async add(
    @Req() request: FastifyRequest,
    @Body() parameter: QueueAddDTO,
    @CredentialAccount() account
  ) {
    return await this.operationQueueService.add(
      parameter,
      account,
      request.headers.authorization
    )
  }
}
