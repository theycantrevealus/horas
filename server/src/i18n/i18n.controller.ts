import { Authorization } from '@/decorators/auth.decorator'
import {
  HttpExceptionFilter,
  RequestValidatorFilter,
  PostgreFilter,
  UnAuthorizedExceptionFilter,
} from '@/filters/validator.filter'
import { JwtAuthGuard } from '@/guards/jwt.guard'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { Corei18nModel } from '@/models/core.i18n.model'
import { CoreMenuModel } from '@/models/core.menu.model'
import { isJsonString } from '@/utilities/mod.lib'
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger'
import { Corei18nDTOAdd } from './dtos/i18n.add'
import { Corei18nDTOEdit } from './dtos/i18n.edit'
import { Corei18nService } from './i18n.service'

@Controller({ path: 'i18n', version: '1' })
@UseFilters(
  new PostgreFilter(),
  new HttpExceptionFilter(),
  new RequestValidatorFilter(),
  new UnAuthorizedExceptionFilter()
)
@ApiTags('i18n Management')
export class Corei18nController {
  constructor(private corei18nService: Corei18nService) {}

  private logger = new Logger('HTTP')

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get()
  async list() {
    return await this.corei18nService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
  })
  @Get(':id/detail')
  async detail(@Param() param) {
    return await this.corei18nService.detail(param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('add')
  async add(@Body() data: Corei18nDTOAdd) {
    return await this.corei18nService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'id',
  })
  @Put(':id/edit')
  async edit(@Body() data: Corei18nDTOEdit, @Param() param) {
    return await this.corei18nService.edit(data, param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':id/delete')
  async delete_soft(@Param() param) {
    return await this.corei18nService.delete_soft(param.id)
  }
}
