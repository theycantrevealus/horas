import { Authorization, CredentialAccount } from '@decorators/authorization'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  MasterQueueMachineAddDTO,
  MasterQueueMachineEditDTO,
} from '@gateway_core/master/dto/master.queue.machine'
import { MasterQueueMachineService } from '@gateway_core/master/services/master.queue.machine.service'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
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
import { ApiQueryGeneral } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'

@Controller('master')
@ApiTags('Master Data Queue Management')
export class MasterQueueMachineController {
  constructor(
    @Inject(MasterQueueMachineService)
    private readonly masterQueueService: MasterQueueMachineService
  ) {}

  @Get('queue')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all queue machine',
    description: '',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string): Promise<GlobalResponse> {
    return await this.masterQueueService.all(parameter)
  }

  @Get('queue/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any): Promise<GlobalResponse> {
    return await this.masterQueueService.detail(param.id)
  }

  @Post('queue')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add queue',
    description: ``,
  })
  async add(
    @Body() parameter: MasterQueueMachineAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    return await this.masterQueueService.add(parameter, account)
  }

  @Patch('queue/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit queue',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MasterQueueMachineEditDTO,
    @Param() param: any
  ): Promise<GlobalResponse> {
    return await this.masterQueueService.edit(parameter, param.id)
  }

  @Delete('queue/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete queue',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any): Promise<GlobalResponse> {
    return await this.masterQueueService.delete(param.id)
  }
}
