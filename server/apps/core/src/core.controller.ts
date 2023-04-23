import { Authorization } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Delete,
  Get,
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
import { isJSON } from 'class-validator'

import { CoreService } from './core.service'
import { ConfigAddDTO, ConfigEditDTO } from './dto/config'

@Controller()
@ApiTags('AA - System')
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

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
  async add(@Body() parameter: ConfigAddDTO): Promise<GlobalResponse> {
    return await this.coreService.add(parameter)
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
  async edit(@Body() parameter: ConfigEditDTO, @Param() param) {
    return await this.coreService.edit(parameter, param.id)
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
  async delete(@Param() param): Promise<GlobalResponse> {
    return await this.coreService.delete(param.id)
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
