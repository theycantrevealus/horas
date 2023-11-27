import { LOVAddDTO, LOVEditDTO } from '@core/lov/dto/lov'
import { LOVService } from '@core/lov/lov.service'
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

@Controller('lov')
@ApiTags('LOV')
export class LOVController {
  constructor(@Inject(LOVService) private readonly lovService: LOVService) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing brand data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(
    @Res() response: FastifyReply,
    @Query('lazyEvent') parameter: string
  ) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      await this.lovService
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

  @Get(':id')
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
  async detail(@Res() response: FastifyReply, @Param() param) {
    await this.lovService
      .detail(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item brand',
    description: ``,
  })
  async add(
    @Res() response: FastifyReply,
    @Body() parameter: LOVAddDTO,
    @CredentialAccount() account
  ) {
    await this.lovService
      .add(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item brand',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Res() response: FastifyReply,
    @Body() parameter: LOVEditDTO,
    @Param() param
  ) {
    await this.lovService
      .edit(parameter, param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete lov',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Res() response: FastifyReply, @Param() param) {
    await this.lovService
      .delete(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }
}
