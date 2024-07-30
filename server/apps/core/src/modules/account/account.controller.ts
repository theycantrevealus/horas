import { AccountAddDTO, AccountEditDTO } from '@core/account/dto/account.dto'
import { AccountSignInDTO } from '@core/account/dto/account.signin.dto'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
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
import { GlobalResponse } from '@utility/dto/response'

import { AccountService } from './account.service'

@Controller('account')
@ApiTags('Account Management')
export class AccountController {
  constructor(
    @Inject(AccountService) private readonly accountService: AccountService
  ) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'CoreAccount', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing account data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async accountAll(
    @Query('lazyEvent') parameter: string
  ): Promise<GlobalResponse> {
    return await this.accountService.accountAll(parameter)
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'CoreAccount', action: 'view' })
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.accountService.accountDetail(param.id)
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'CoreAccount', action: 'add' })
  @ApiOperation({
    summary: 'Add new account',
    description: ``,
  })
  async add(
    @Body() parameter: AccountAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
    // @AccountToken() token: string
  ): Promise<GlobalResponse> {
    return await this.accountService.accountAdd(parameter, account)
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
  @PermissionManager({ group: 'CoreAccount', action: 'edit' })
  @ApiOperation({
    summary: 'Edit account',
    description: ``,
  })
  async edit(@Body() body: AccountEditDTO, @Param() param) {
    return await this.accountService.accountEdit(body, param.id)
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
  @PermissionManager({ group: 'CoreAccount', action: 'delete' })
  @ApiOperation({
    summary: 'Delete account',
    description: ``,
  })
  async delete(@Param() param) {
    return await this.accountService.accountDelete(param.id)
  }

  @Post('signin')
  @Version('1')
  @ApiOperation({
    summary: 'Generate account access token',
    description: ``,
  })
  async signIn(@Body() body: AccountSignInDTO) {
    return await this.accountService.signIn(body)
  }

  // @Get('authority')
  // @Version('1')
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(LoggingInterceptor)
  // @Authorization(true)
  // @ApiBearerAuth('JWT')
  // @ApiOperation({
  //   summary: 'Fetch all account authority',
  //   description: 'Showing account authority data',
  // })
  // @ApiQuery(ApiQueryGeneral.primeDT)
  // async authorityAll(@Query('lazyEvent') parameter: string) {
  //   return await this.accountService.authorityAll(parameter)
  // }
  //
  // @Get('authority/:id')
  // @Version('1')
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(LoggingInterceptor)
  // @Authorization(true)
  // @ApiBearerAuth('JWT')
  // @ApiParam({
  //   name: 'id',
  // })
  // @ApiOperation({
  //   summary: 'Detail data',
  //   description: '',
  // })
  // async authorityDetail(@Param() param) {
  //   return await this.accountService
  //     .authorityDetail(param.id)
  //     .catch((error) => {
  //       throw error
  //     })
  // }
  //
  // @Post('authority')
  // @Version('1')
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(LoggingInterceptor)
  // @Authorization(true)
  // @ApiBearerAuth('JWT')
  // @ApiOperation({
  //   summary: 'Add new account',
  //   description: ``,
  // })
  // async authorityAdd(
  //   @Body() parameter: AuthorityAddDTO,
  //   @CredentialAccount() account: IAccountCreatedBy
  // ) {
  //   return await this.accountService
  //     .authorityAdd(parameter, account)
  //     .catch((error) => {
  //       throw error
  //     })
  // }
  //
  // @Patch('authority/:id')
  // @Version('1')
  // @ApiParam({
  //   name: 'id',
  // })
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(LoggingInterceptor)
  // @Authorization(true)
  // @ApiBearerAuth('JWT')
  // @ApiOperation({
  //   summary: 'Edit data',
  //   description: ``,
  // })
  // async authorityEdit(@Body() body: AuthorityEditDTO, @Param() param) {
  //   return await this.accountService
  //     .authorityEdit(body, param.id)
  //     .catch((error) => {
  //       throw error
  //     })
  // }
  // @Delete('authority/:id')
  // @Version('1')
  // @ApiParam({
  //   name: 'id',
  //   description: 'Data document id',
  // })
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(LoggingInterceptor)
  // @Authorization(true)
  // @ApiBearerAuth('JWT')
  // @ApiOperation({
  //   summary: 'Delete authority',
  //   description: ``,
  // })
  // async authorityDelete(@Param() param) {
  //   return await this.accountService
  //     .authorityDelete(param.id)
  //     .catch((error) => {
  //       throw error
  //     })
  // }
}
