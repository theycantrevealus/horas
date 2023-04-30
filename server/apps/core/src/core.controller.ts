import { Authorization } from '@decorators/authorization'
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
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { isJSON } from 'class-validator'
import { Logger } from 'winston'

import { CoreService } from './core.service'
import { ConfigAddDTO, ConfigEditDTO } from './dto/config'
import { Config } from './schemas/config'

@Controller()
@ApiTags('AA - System')
export class CoreController {
  constructor(
    private readonly coreService: CoreService,
    private readonly socketProxy: SocketIoClientProxyService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @Get('configuration/reload')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Reload configuration',
    description: 'Reload redis configuration',
  })
  async reload() {
    return await this.coreService.reloadConfig()
  }

  @Get('configuration')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.coreService.all({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      })
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      }
    }
  }

  @Get('configuration/configured')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all configured',
    description: 'Showing configuration',
  })
  async configure() {
    return await this.coreService.configured()
  }

  @Get('configuration/tree')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch configuration in tree mode',
    description: 'Showing configuration',
  })
  async buildTree() {
    return this.coreService.initTree()
  }

  @Get('configuration/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.coreService.detail(param.id)
  }

  @Post('configuration')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add config',
    description: ``,
  })
  async add(
    @Body() parameter: ConfigAddDTO,
    @Req() request
  ): Promise<GlobalResponse> {
    return await this.coreService.add(parameter).then(async (response) => {
      if (/S0000/.test(response.statusCode)) {
        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: request.headers.authorization,
            },
          })
          .then(async (clientSet) => {
            await clientSet
              .emit('config', {
                sender: request.headers.authorization,
                receiver: null,
                payload: response,
              } satisfies ProceedDataTrafficDTO)
              .then(() => {
                clientSet.disconnect()
              })
          })
          .catch((e: Error) => {
            this.logger.warn('Failed to connect')
          })
      }
      return response
    })
  }

  @Patch('configuration/batch')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit config bulk',
    description: ``,
  })
  async editBulk(@Body() parameter: Config[], @Param() param, @Req() request) {
    return await this.coreService
      .editBulk(parameter)
      .then(async (response) => {
        if (/S0000/.test(response.statusCode)) {
          await this.socketProxy
            .reconnect({
              extraHeaders: {
                Authorization: request.headers.authorization,
              },
            })
            .then(async (clientSet) => {
              await clientSet
                .emit('config', {
                  sender: request.headers.authorization,
                  receiver: null,
                  payload: response,
                } satisfies ProceedDataTrafficDTO)
                .then(() => {
                  clientSet.disconnect()
                })
            })
            .catch((e: Error) => {
              this.logger.warn('Failed to connect')
            })
        } else {
          this.logger.verbose(response)
        }
        return response
      })
      .catch((e: Error) => {
        this.logger.warn(e)
      })
  }

  @Patch('configuration/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit config',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: ConfigEditDTO, @Param() param, @Req() request) {
    return await this.coreService
      .edit(parameter, param.id)
      .then(async (response) => {
        if (/S0000/.test(response.statusCode)) {
          await this.socketProxy
            .reconnect({
              extraHeaders: {
                Authorization: request.headers.authorization,
              },
            })
            .then(async (clientSet) => {
              await clientSet
                .emit('config', {
                  sender: request.headers.authorization,
                  receiver: null,
                  payload: response,
                } satisfies ProceedDataTrafficDTO)
                .then(() => {
                  clientSet.disconnect()
                })
            })
            .catch((e: Error) => {
              this.logger.warn('Failed to connect')
            })
        }
        return response
      })
  }

  @Delete('configuration/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete config',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param, @Req() request): Promise<GlobalResponse> {
    return await this.coreService.delete(param.id).then(async (response) => {
      if (/S0000/.test(response.statusCode)) {
        await this.socketProxy
          .reconnect({
            extraHeaders: {
              Authorization: request.headers.authorization,
            },
          })
          .then(async (clientSet) => {
            await clientSet
              .emit('config', {
                sender: request.headers.authorization,
                receiver: null,
                payload: response,
              } satisfies ProceedDataTrafficDTO)
              .then(() => {
                clientSet.disconnect()
              })
          })
          .catch((e: Error) => {
            this.logger.warn('Failed to connect')
          })
      }
      return response
    })
  }

  //==============================================================================LOG
  @Get('log')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing brand data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async log(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.coreService.log({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      })
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      }
    }
  }
}
