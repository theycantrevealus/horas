import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { i18nAddDTO, i18nEditDTO } from '@gateway_core/i18n/dto/i18n'
import { I18nService } from '@gateway_core/i18n/i18n.service'
import { JwtAuthGuard } from '@guards/jwt'
import { HORASInterceptor } from '@interceptors/default'
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

@Controller('i18n')
@ApiTags('i18n Management')
export class I18nController {
  constructor(
    @Inject(I18nService)
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'i18n', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all data',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.i18nService.all(parameter)
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'i18n', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.i18nService.detail(param.id)
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'i18n', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new data',
    description: ``,
  })
  async add(@Body() parameter: i18nAddDTO, @CredentialAccount() account) {
    return await this.i18nService.add(parameter, account)
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'i18n', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit data',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: i18nEditDTO, @Param() param) {
    return await this.i18nService.edit(parameter, param.id)
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'i18n', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete data',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param) {
    return await this.i18nService.delete(param.id)
  }
}
