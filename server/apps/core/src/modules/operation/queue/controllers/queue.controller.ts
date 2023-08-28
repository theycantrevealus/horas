import { QueueAddDTO } from '@core/operation/queue/dto/queue'
import { OperationQueueService } from '@core/operation/queue/services/operation-queue.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Body,
  Controller,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyReply, FastifyRequest } from 'fastify'

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
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new queue',
    description: ``,
  })
  async add(
    @Req() request: FastifyRequest,
    @Body() parameter: QueueAddDTO,
    @CredentialAccount() account,
    @Res() response: FastifyReply
  ) {
    await this.operationQueueService
      .add(parameter, account, request.headers.authorization)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }
}
