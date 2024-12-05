import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Socket } from 'socket.io-client'

import {
  CallQueueDTO,
  QueueMachineAddQueueDTO,
  ReceptionistCounterAssignDTO,
} from './dto/queue.machine.dto'
import { GatewayQueueService } from './gateway_queue.service'

@Controller('queue')
@ApiTags('Queue Management')
export class GatewayQueueController {
  constructor(
    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    private readonly gatewayQueueService: GatewayQueueService
  ) {}

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
  async queueMachineAll(
    @CredentialAccount() account: IAccount
  ): Promise<GlobalResponse> {
    return await this.gatewayQueueService.queueMachineAvail(account)
  }

  @Post('assign')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Queue', action: 'assign' })
  @ApiOperation({
    summary: 'Assign receptionist to counter',
    description: ``,
  })
  async assignReceptionist(
    @Body() data: ReceptionistCounterAssignDTO,
    @CredentialAccount() account: IAccount
  ): Promise<GlobalResponse> {
    return await this.gatewayQueueService.assignReceptionist('', data, account)
  }

  @Post('call')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Queue', action: 'call' })
  @ApiOperation({
    summary: 'Call queue',
    description: ``,
  })
  async callQueue(@Body() data: CallQueueDTO): Promise<GlobalResponse> {
    return await this.gatewayQueueService.callQueue(data)
  }

  @Post('add')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Queue', action: 'add' })
  @ApiOperation({
    summary: 'Add new queue',
    description: ``,
  })
  async add(
    @Req() request: any,
    @CredentialAccount() account: IAccount,
    @Body() parameter: QueueMachineAddQueueDTO
  ): Promise<GlobalResponse> {
    return await this.gatewayQueueService
      .addQueue(parameter)
      .then(async (response) => {
        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: `${request.headers.authorization}`,
            },
          })
          .then(async (clientSet: Socket) => {
            clientSet.emit('queue', {
              sender: account,
              receiver: null,
              payload: response,
            } satisfies ProceedDataTrafficDTO)
            // TODO : Should it disconnected? Performance test dan research
            // await clientSet.disconnect()
          })
          .catch((socketError: Error) => {
            response.message = `Queue failed to create`
            response.statusCode = {
              ...modCodes[this.constructor.name].error.databaseError,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.payload = socketError
            throw new Error(JSON.stringify(response))
          })

        return response
      })
  }

  @Get('next')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Queue', action: 'next' })
  @ApiOperation({
    summary: 'Get next queue',
    description: ``,
  })
  @ApiParam({
    name: 'queue_machine',
  })
  async nextQueue(@Param() param: any): Promise<GlobalResponse> {
    return await this.gatewayQueueService.otherQueue(
      param.queue_machine,
      'next'
    )
  }

  @Get('previous')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Queue', action: 'previous' })
  @ApiOperation({
    summary: 'Get previous queue',
    description: ``,
  })
  @ApiParam({
    name: 'queue_machine',
  })
  async previouseQueue(@Param() param: any): Promise<GlobalResponse> {
    return await this.gatewayQueueService.otherQueue(
      param.queue_machine,
      'previous'
    )
  }
}
