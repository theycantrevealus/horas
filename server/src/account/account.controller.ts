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
import { Response, response } from 'express'
import * as fs from 'fs'
import { GrantAccessDTO } from './dtos/account.dto.grant.access'
import { GrantPermissionDTO } from './dtos/account.dto.grant.permission'
import { AccountLoginDTO } from './dtos/account.dto.login'
import { AccountEditDTO } from './dtos/account.dto.edit'

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

  @ApiOperation({
    summary: 'For login access',
  })
  @Post('login')
  async login(@Body() data: AccountLoginDTO) {
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
  @ApiOperation({
    summary: 'List all user (Paginate / Prime Datatable support)',
  })
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
  @ApiOperation({
    summary: 'Get an account detail information',
  })
  @ApiParam({
    name: 'id',
  })
  @Get(':id/detail')
  async detail(@Param() param) {
    return await this.accountService.detail(param.id)
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth('JWT')
  // @Authorization(true)
  @ApiOperation({
    summary: 'Get an account profile image',
  })
  @ApiParam({
    name: 'id',
  })
  @Get(':id/avatar')
  @Header('Content-Type', 'image/png')
  async avatar(@Param() param, @Res() response: Response) {
    const data = fs.createReadStream(`avatar/${param.id}.png`)
    data.on('error', (err) => {
      data.close()
    })
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=${param.id}.png`
    )

    data.pipe(response)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Delete an account',
  })
  @ApiParam({
    name: 'id',
  })
  @Delete(':id/delete')
  async deleteSoft(@Param() param): Promise<GlobalResponse> {
    return await this.accountService.deleteSoft(param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Add new account',
  })
  @Post('add')
  async add(@Body() data: AccountModel): Promise<GlobalResponse> {
    return await this.accountService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Update an account information',
  })
  @ApiParam({
    name: 'id',
  })
  @Put(':id/edit')
  async edit(
    @Body() data: AccountEditDTO,
    @Param() param
  ): Promise<GlobalResponse> {
    return await this.accountService.edit(data, param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiOperation({
    summary: 'Get detail account access information',
  })
  @Get('access')
  async getAccountAccessMeta(@CredentialAccount() credential: AccountModel) {
    return this.accountService.getAccountAccessMeta(credential)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Grant specific access to an account',
  })
  @Post('grant_access')
  async grantAccess(
    @Body() data: GrantAccessDTO,
    @CredentialAccount() account: AccountModel
  ): Promise<GlobalResponse> {
    return await this.accountService.grantAccess(data, account)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Grant specific permission to an account',
  })
  @Post('grant_permission')
  async grantPermission(
    @Body() data: GrantPermissionDTO,
    @CredentialAccount() account: AccountModel
  ): Promise<GlobalResponse> {
    return await this.accountService.grantPermission(data, account)
  }
}
