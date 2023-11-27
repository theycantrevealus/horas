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
import { Logger } from 'winston'

import { AccountService } from './account.service'

@Controller('authority')
@ApiTags('Authority Management')
export class AuthorityController {
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
    summary: 'Fetch all account authority',
    description: 'Showing account authority data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.accountService.authorityAll(parameter)
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
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
    return await this.accountService.authorityDetail(param.id)
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new account',
    description: ``,
  })
  async add(
    @Body() parameter: AuthorityAddDTO,
    @CredentialAccount() account: Account
  ) {
    return await this.accountService.authorityAdd(parameter, account)
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
    summary: 'Edit data',
    description: ``,
  })
  async edit(@Body() body: AuthorityEditDTO, @Param() param) {
    return await this.accountService.authorityEdit(body, param.id)
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
    summary: 'Delete authority',
    description: ``,
  })
  async delete(@Param() param) {
    return await this.accountService.authorityDelete(param.id)
  }
}
