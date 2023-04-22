import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
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

@Controller('master')
@ApiTags('Master Data Management')
export class MasterItemSupplierController {
  private masterItemSupplierService: MasterItemSupplierService
  constructor(masterItemSupplierService: MasterItemSupplierService) {
    this.masterItemSupplierService = masterItemSupplierService
  }

  @Get('supplier')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all supplier',
    description: 'Showing supplier data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.masterItemSupplierService.all({
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

  @Get('supplier/find')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Find data',
    description: '',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: true,
  })
  async find(@Query() parameter) {
    return await this.masterItemSupplierService.find(
      parameter.search,
      parameter.limit
    )
  }

  @Get('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Query() param) {
    return await this.masterItemSupplierService.detail(param.id)
  }

  @Post('supplier')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item supplier',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemSupplierAddDTO,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.masterItemSupplierService.add(parameter, account)
  }

  @Patch('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item supplier',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: MasterItemSupplierEditDTO, @Param() param) {
    return await this.masterItemSupplierService.edit(parameter, param.id)
  }

  @Delete('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item supplier',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param): Promise<GlobalResponse> {
    return await this.masterItemSupplierService.delete(param.id)
  }
}
