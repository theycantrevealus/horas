import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@core/master/dto/master.item.category'
import { MasterItemCategoryService } from '@core/master/services/master.item.category.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
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
export class MasterItemCategoryController {
  constructor(
    @Inject(MasterItemCategoryService)
    private readonly masterItemCategoryService: MasterItemCategoryService
  ) {}

  @Get('category')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing categories data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(
    @Res() response: FastifyReply,
    @Query('lazyEvent') parameter: string
  ) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      await this.masterItemCategoryService
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

  @Get('category/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Res() response: FastifyReply, @Param() param) {
    await this.masterItemCategoryService
      .detail(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post('category')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item category',
    description: ``,
  })
  async add(
    @Res() response: FastifyReply,
    @Body() parameter: MasterItemCategoryAddDTO,
    @CredentialAccount() account
  ) {
    await this.masterItemCategoryService
      .add(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch('category/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item category',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Res() response: FastifyReply,
    @Body() parameter: MasterItemCategoryEditDTO,
    @Param() param
  ) {
    await this.masterItemCategoryService
      .edit(parameter, param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete('category/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item category',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Res() response: FastifyReply, @Param() param) {
    await this.masterItemCategoryService
      .delete(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }
}
