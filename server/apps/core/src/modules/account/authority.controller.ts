import { AuthorityService } from '@core/account/authority.service'
import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@core/account/dto/authority.dto'
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

@Controller('authority')
@ApiTags('Authority Management')
export class AuthorityController {
  constructor(
    @Inject(AuthorityService)
    private readonly authorityService: AuthorityService
  ) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'CoreAuthority', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all account authority',
    description: 'Showing account authority data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.authorityService.all(parameter)
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'CoreAuthority', action: 'view' })
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.authorityService.detail(param.id)
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'CoreAuthority', action: 'add' })
  @ApiOperation({
    summary: 'Add new account',
    description: ``,
  })
  async add(
    @Body() parameter: AuthorityAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    return await this.authorityService.add(parameter, account)
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
  @PermissionManager({ group: 'CoreAuthority', action: 'edit' })
  @ApiOperation({
    summary: 'Edit data',
    description: ``,
  })
  async edit(@Body() body: AuthorityEditDTO, @Param() param) {
    return await this.authorityService.edit(body, param.id)
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
  @PermissionManager({ group: 'CoreAuthority', action: 'delete' })
  @ApiOperation({
    summary: 'Delete authority',
    description: ``,
  })
  async delete(@Param() param) {
    return await this.authorityService.delete(param.id)
  }
}
