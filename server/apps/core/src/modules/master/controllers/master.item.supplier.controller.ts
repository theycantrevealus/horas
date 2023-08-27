import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import { MasterItemSupplierService } from '@core/master/services/master.item.supplier.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
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
import { isJSON } from 'class-validator'
import { FastifyReply } from 'fastify'

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
  async all(
    @Res() response: FastifyReply,
    @Query('lazyEvent') parameter: string
  ) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      await this.masterItemSupplierService
        .all({
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        })
        .then((result) => {
          response.code(HttpStatus.OK).send(result)
        })
        .catch((error) => {
          response.code(HttpStatus.BAD_REQUEST).send(error.message)
        })
    } else {
      response.code(HttpStatus.BAD_REQUEST).send({
        message: 'filters is not a valid json',
        payload: {},
      })
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
  async find(@Res() response: FastifyReply, @Query() parameter) {
    await this.masterItemSupplierService
      .find(parameter.search, parameter.limit)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
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
  async detail(@Res() response: FastifyReply, @Query() param) {
    await this.masterItemSupplierService
      .detail(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post('supplier')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item supplier',
    description: ``,
  })
  async add(
    @Res() response: FastifyReply,
    @Body() parameter: MasterItemSupplierAddDTO,
    @CredentialAccount() account
  ) {
    await this.masterItemSupplierService
      .add(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item supplier',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Res() response: FastifyReply,
    @Body() parameter: MasterItemSupplierEditDTO,
    @Param() param
  ) {
    await this.masterItemSupplierService
      .edit(parameter, param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item supplier',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Res() response: FastifyReply, @Param() param) {
    await this.masterItemSupplierService
      .delete(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }
}
