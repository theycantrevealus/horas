import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { AuthorityAddDTO, AuthorityEditDTO } from '@core/account/dto/authority'
import { Account } from '@core/account/schemas/account.model'
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
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { isJSON } from 'class-validator'
import { FastifyReply } from 'fastify'
import { Logger } from 'winston'

import { AccountService } from './account.service'
import { AccountAddDTO } from './dto/account.add'

@Controller('account')
@ApiTags('Account Management')
export class AccountController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(AccountService) private readonly accountService: AccountService
  ) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing account data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(
    @Res() response: FastifyReply,
    @Query('lazyEvent') parameter: string
  ) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      await this.accountService
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

  @Get('authenticate')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Authenticate token',
    description: '',
  })
  async authenticate(
    @Res() response: FastifyReply,
    @CredentialAccount() account: Account
  ) {
    response.code(HttpStatus.OK).send({
      statusCode: '200',
      message: 'Authenticated successfully',
      payload: await this.accountService.detail(account.id),
      transaction_classify: 'AUTHENTICATE',
      transaction_id: null,
    })
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Res() response: FastifyReply, @Param() param) {
    await this.accountService
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
    summary: 'Add new account',
    description: ``,
  })
  async add(
    @Res() response: FastifyReply,
    @Body() parameter: AccountAddDTO,
    @CredentialAccount() account: Account
  ) {
    await this.accountService
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
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit account',
    description: ``,
  })
  async edit(
    @Res() response: FastifyReply,
    @Body() body: AccountEditDTO,
    @Param() param
  ) {
    await this.accountService
      .edit(body, param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete(':id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete account',
    description: ``,
  })
  async delete(@Res() response: FastifyReply, @Param() param) {
    await this.accountService
      .delete(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Post('signin')
  @Version('1')
  @ApiOperation({
    summary: 'Generate account access token',
    description: ``,
  })
  async signIn(@Body() body: AccountSignInDTO, @Res() response: FastifyReply) {
    await this.accountService
      .signIn(body)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('authority')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all account authority',
    description: 'Showing account authority data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async authorityAll(
    @Res() response: FastifyReply,
    @Query('lazyEvent') parameter: string
  ) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      await this.accountService
        .authorityAll({
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

  @Get('authority/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async authorityDetail(@Res() response: FastifyReply, @Param() param) {
    await this.accountService
      .authorityDetail(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post('authority')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new account',
    description: ``,
  })
  async authorityAdd(
    @Res() response: FastifyReply,
    @Body() parameter: AuthorityAddDTO,
    @CredentialAccount() account: Account
  ) {
    await this.accountService
      .authorityAdd(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch('authority/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit data',
    description: ``,
  })
  async authorityEdit(
    @Res() response: FastifyReply,
    @Body() body: AuthorityEditDTO,
    @Param() param
  ) {
    await this.accountService
      .authorityEdit(body, param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }
  @Delete('authority/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete authority',
    description: ``,
  })
  async authorityDelete(@Res() response: FastifyReply, @Param() param) {
    await this.accountService
      .authorityDelete(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }
}
