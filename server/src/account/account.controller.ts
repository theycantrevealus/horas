import {
  Controller,
  Body,
  Post,
  UseGuards,
  Get,
  Param,
  Put,
  UseInterceptors,
  Delete,
  Logger,
  Query,
  UseFilters,
  Version,
  Res,
  Header,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiParam, ApiOperation } from '@nestjs/swagger'
import { AccountService } from '@/account/account.service'
import { isJsonString } from '@utilities/mod.lib'
import {
  AccountLoginDTO,
  AccountLoginResponseDTO,
} from '@/account/dtos/account.login.dto'
import { JwtAuthGuard } from '@/guards/jwt.guard'
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { AccountModel } from '@/models/account.model'
import {
  MongooseFilter,
  HttpExceptionFilter,
  RequestValidatorFilter,
  PostgreFilter,
  UnAuthorizedExceptionFilter,
} from '@/filters/validator.filter'
import { GrantAccessDTO } from './dtos/account.grant.access.dto'
import { GrantPermissionDTO } from './dtos/account.grant.permission.dto'
import { Response, response } from 'express'
import { createReadStream } from 'fs'

@Controller({ path: 'account', version: '1' })
@UseFilters(
  new PostgreFilter(),
  new HttpExceptionFilter(),
  new RequestValidatorFilter(),
  new UnAuthorizedExceptionFilter()
)
@ApiTags('Account Management')
export class AccountController {
  private logger = new Logger('HTTP')

  constructor(private accountService: AccountService) {}

  @Post('login')
  async login(@Body() data: AccountLoginDTO): Promise<AccountLoginResponseDTO> {
    return this.accountService.login(data)
  }

  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all user' })
  @Get()
  async list() {
    return await this.accountService.all()
  }

  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all user (Paginate)' })
  @Get('paginate')
  async paginate(
    @Query('first') first: number,
    @Query('rows') rows: number,
    @Query('sortOrder') sortOrder: number,
    @Query('sortField') sortField: string,
    @Query('filters') filters: any
  ) {
    const filterSet = isJsonString(filters) ? JSON.parse(filters) : {}
    const data = await this.accountService.paginate({
      rows: rows,
      first: first,
      sortOrder: sortOrder,
      sortField: sortField,
      filter: filterSet,
    })

    return data
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @Get(':uid/detail')
  async detail(@Param() param) {
    return await this.accountService.detail(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @Get(':uid/avatar')
  @Header('Content-Type', 'image/png')
  async avatar(@Param() param, @Res() response: Response) {
    //0fb77186-6954-4fb1-a69e-9806f2e42b52
    const data = createReadStream(`avatar/${param.uid}.png`)

    response.setHeader('Content-Disposition', 'attachment; filename=avatar.png')

    data.pipe(response)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'uid',
  })
  @Delete(':uid/delete')
  async delete_soft(@Param() param): Promise<GlobalResponse> {
    return await this.accountService.delete_soft(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('add')
  async add(@Body() data: AccountModel): Promise<GlobalResponse> {
    return await this.accountService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'uid',
  })
  @Put(':uid/edit')
  async edit(@Body() data, @Param() param): Promise<GlobalResponse> {
    return await this.accountService.edit(data, param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('grant_access')
  async grant_access(
    @Body() data: GrantAccessDTO,
    @CredentialAccount() account: AccountModel
  ): Promise<GlobalResponse> {
    return await this.accountService.grant_access(data, account)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('grant_permission')
  async grant_permission(
    @Body() data: GrantPermissionDTO,
    @CredentialAccount() account: AccountModel
  ): Promise<GlobalResponse> {
    return await this.accountService.grant_permission(data, account)
  }
}
