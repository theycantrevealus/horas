import { Controller, Body, Post, UseGuards, Get, HttpStatus, Param, Put, UseInterceptors, Delete, Req, Logger, Request, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiParam, ApiOperation } from '@nestjs/swagger'
import { LicenseService } from './license.service'
import { LoggingInterceptor } from '../interceptor/logging'
import { JwtAuthGuard } from '../guard/jwt.guard'
import { Authorization } from '../decorator/auth.decorator'
import { isJsonString } from '../mod.lib'
import { LicenseAddDTO } from './dto/license.add.dto'

@Controller('license')
@ApiTags('license')
export class LicenseController {
  constructor(
    private licenseService: LicenseService
  ) { }

  private logger = new Logger('HTTP')


  //=========================================================================================== ADD DATA
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Post('add')
  @UseInterceptors(LoggingInterceptor)
  async add (@Body() data: LicenseAddDTO) {
    return await this.licenseService.add(data)
  }

  //=========================================================================================== FETCH DATA

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all user' })
  @Authorization(true)
  @Get()
  async list () {
    return this.licenseService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all license (Paginate)' })
  @Authorization(true)
  @Get('paginate')
  async paginate (
    @Query('first') first: number,
    @Query('rows') rows: number,
    @Query('sortOrder') sortOrder: number,
    @Query('sortField') sortField: string,
    @Query('filters') filters: any
  ) {

    const filterSet = (isJsonString(filters)) ? JSON.parse(filters) : {}

    const data = await this.licenseService.paginate({
      rows: rows,
      first: first,
      sortOrder: sortOrder,
      sortField: sortField,
      filter: filterSet
    })

    return data
  }

}