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
import { Config } from '@schemas/config/config'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { isJSON } from 'class-validator'
import { Logger } from 'winston'

import { ConfigAddDTO, ConfigEditDTO } from './dto/config'
import { GatewayCoreService } from './gateway.core.service'

@Controller()
@ApiTags('AA - System')
export class GatewayCoreController {
  constructor(
    private readonly gatewayCoreService: GatewayCoreService,
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
    return await this.gatewayCoreService.reloadConfig()
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
      return await this.gatewayCoreService.all({
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
    return await this.gatewayCoreService.configured()
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
    return this.gatewayCoreService.initTree()
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
    return await this.gatewayCoreService.detail(param.id)
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
    return await this.gatewayCoreService
      .add(parameter)
      .then(async (response) => {
        if (/S0000/.test(response.statusCode.customCode)) {
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
            .catch((error: Error) => {
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
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
    return await this.gatewayCoreService
      .editBulk(parameter)
      .then(async (response) => {
        if (/S0000/.test(response.statusCode.customCode)) {
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
            .catch((error: Error) => {
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
            })
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
    return await this.gatewayCoreService
      .edit(parameter, param.id)
      .then(async (response) => {
        if (/S0000/.test(response.statusCode.customCode)) {
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
            .catch((error: Error) => {
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
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
    return await this.gatewayCoreService
      .delete(param.id)
      .then(async (response) => {
        if (/S0000/.test(response.statusCode.customCode)) {
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
            .catch((error: Error) => {
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
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
      return await this.gatewayCoreService.log({
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
