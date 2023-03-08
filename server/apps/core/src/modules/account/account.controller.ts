import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { Account } from '@core/account/schemas/account.model'
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

import { AccountService } from './account.service'
import { AccountAddDTO } from './dto/account.add'

@Controller('account')
@ApiTags('Account Management')
export class AccountController {
  private accountService: AccountService

  constructor(accountService: AccountService) {
    this.accountService = accountService
  }

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
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.accountService.all({
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

  @Get('authenticate')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Authenticate token',
    description: '',
  })
  async authenticate() {}

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new account',
    description: ``,
  })
  async add(
    @Body() parameter: AccountAddDTO,
    @CredentialAccount() account: Account
  ): Promise<GlobalResponse> {
    return await this.accountService.add(parameter, account)
  }

  @Patch(':_id')
  @Version('1')
  @ApiParam({
    name: '_id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit account',
    description: ``,
  })
  async edit(
    @Body() body: AccountEditDTO,
    @Param() param
  ): Promise<GlobalResponse> {
    return await this.accountService.edit(body, param._id)
  }

  @Delete(':_id')
  @Version('1')
  @ApiParam({
    name: '_id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete account',
    description: ``,
  })
  async delete(@Param() param): Promise<GlobalResponse> {
    return this.accountService.delete(param._id)
  }

  @Post('signin')
  @Version('1')
  @ApiOperation({
    summary: 'Generate account access token',
    description: ``,
  })
  async signin(@Body() body: AccountSignInDTO) {
    return this.accountService.signin(body)
  }
}
