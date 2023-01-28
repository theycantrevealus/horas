import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { Authorization } from '@decorators/authorization'
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { GlobalResponse } from '@utility/dto/response'

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
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing account data',
  })
  async all() {}

  @Get('authenticate')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Authenticate token',
    description: '',
  })
  async authenticate() {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new account',
    description: ``,
  })
  async add(@Body() parameter: AccountAddDTO): Promise<GlobalResponse> {
    return await this.accountService.add(parameter)
  }

  @Patch(':_id')
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

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete account',
    description: ``,
  })
  async delete() {}

  @Post('signin')
  @ApiOperation({
    summary: 'Generate account access token',
    description: ``,
  })
  async signin(@Body() body: AccountSignInDTO) {
    return this.accountService.signin(body)
  }
}
