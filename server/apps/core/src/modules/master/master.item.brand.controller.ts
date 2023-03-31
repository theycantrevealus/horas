import {
  MasterItemBrandAddDTO,
  MasterItemBrandEditDTO,
} from '@core/master/dto/master.item.brand'
import { MasterItemBrandService } from '@core/master/master.item.brand.service'
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
export class MasterItemBrandController {
  private masterItemBrandService: MasterItemBrandService
  constructor(masterItembrandService: MasterItemBrandService) {
    this.masterItemBrandService = masterItembrandService
  }

  @Get('brand')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing brand data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.masterItemBrandService.all({
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

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.masterItemBrandService.detail(param.id)
  }

  @Post('brand')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item brand',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemBrandAddDTO,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.masterItemBrandService.add(parameter, account)
  }

  @Patch('brand/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item brand',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: MasterItemBrandEditDTO, @Param() param) {
    return await this.masterItemBrandService.edit(parameter, param.id)
  }

  @Delete('brand/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item brand',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param): Promise<GlobalResponse> {
    return await this.masterItemBrandService.delete(param.id)
  }
}
