import { AccountEditDTO } from '@core/account/dto/account.edit.dto'
import { AccountSignInDTO } from '@core/account/dto/account.signin.dto'
import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@core/account/dto/authority.dto'
import { Account } from '@core/account/schemas/account.model'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Inject,
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
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { isJSON } from 'class-validator'
import { Logger } from 'winston'

import { AccountService } from './account.service'
import { AccountAddDTO } from './dto/account.add.dto'

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
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing account data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.accountService
        .accountAll({
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        })
        .catch((error) => {
          throw new Error(error)
        })
    } else {
      throw new Error('filters is not a valid json')
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
  async authenticate(@CredentialAccount() account: Account) {
    return {
      statusCode: '200',
      message: 'Authenticated successfully',
      payload: await this.accountService.accountDetail(account.id),
      transaction_classify: 'AUTHENTICATE',
      transaction_id: null,
    }
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
  async detail(@Param() param) {
    return await this.accountService.accountDetail(param.id).catch((error) => {
      throw new Error(error)
    })
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new account',
    description: ``,
  })
  async add(
    @Body() parameter: AccountAddDTO,
    @CredentialAccount() account: Account
  ) {
    return await this.accountService
      .accountAdd(parameter, account)
      .catch((error) => {
        throw new Error(error)
      })
  }

  @Patch(':id')
  @Version('1')
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit account',
    description: ``,
  })
  async edit(@Body() body: AccountEditDTO, @Param() param) {
    return await this.accountService
      .accountEdit(body, param.id)
      .catch((error) => {
        throw new Error(error)
      })
  }

  @Delete(':id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete account',
    description: ``,
  })
  async delete(@Param() param) {
    return await this.accountService.accountDelete(param.id).catch((error) => {
      throw new Error(error)
    })
  }

  @Post('signin')
  @Version('1')
  @ApiOperation({
    summary: 'Generate account access token',
    description: ``,
  })
  async signIn(@Body() body: AccountSignInDTO) {
    return await this.accountService.signIn(body).catch((error) => {
      throw new Error(error)
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
  async authorityAll(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.accountService
        .authorityAll({
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        })
        .catch((error) => {
          throw new Error(error)
        })
    } else {
      throw new Error('filters is not a valid json')
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
  async authorityDetail(@Param() param) {
    return await this.accountService
      .authorityDetail(param.id)
      .catch((error) => {
        throw new Error(error)
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
    @Body() parameter: AuthorityAddDTO,
    @CredentialAccount() account: Account
  ) {
    return await this.accountService
      .authorityAdd(parameter, account)
      .catch((error) => {
        throw new Error(error)
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
  async authorityEdit(@Body() body: AuthorityEditDTO, @Param() param) {
    return await this.accountService
      .authorityEdit(body, param.id)
      .catch((error) => {
        throw new Error(error)
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
  async authorityDelete(@Param() param) {
    return await this.accountService
      .authorityDelete(param.id)
      .catch((error) => {
        throw new Error(error)
      })
  }
}
