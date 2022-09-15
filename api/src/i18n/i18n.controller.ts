import { Authorization } from '@/decorator/auth.decorator'
import { JwtAuthGuard } from '@/guard/jwt.guard'
import { LoggingInterceptor } from '@/interceptor/logging'
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { I18nAddDTO } from './dto/i18n.add.dto'
import { I18nEditDTO } from './dto/i18n.edit.dto'
import { I18nService } from './i18n.service'

@Controller('i18n')
@ApiTags('i18n')
export class I18nController {
  constructor(private i18nService: I18nService) {}

  private logger = new Logger('HTTP')

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '/i18n/{ iso_code_3_digit }/{ identifier }' })
  @Authorization(true)
  @ApiParam({
    name: 'iso',
    description: 'ISO Code 3 Digits',
  })
  @ApiParam({
    name: 'route',
    description: 'Route Camel Case Name',
  })
  @Get('/i18n/:iso/:route')
  async fetch_caption(@Param() param) {
    return await this.i18nService.fetch_caption(param.route, param.iso)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get Registered ISO' })
  @Authorization(true)
  @Get('/i18n/iso')
  async fetch_iso(@Param() param) {
    return await this.i18nService.iso_list()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add i18n' })
  @Authorization(true)
  @Post('/i18n/add')
  @UseInterceptors(LoggingInterceptor)
  async add(@Body() data: I18nAddDTO) {
    return await this.i18nService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiOperation({ summary: 'Edit i18n' })
  @ApiParam({
    name: 'id',
    description: 'ID',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put('/i18n/:id/edit')
  async edit(@Body() data: I18nEditDTO, @Param() param) {
    return await this.i18nService.edit(data, param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
    description: 'ID',
  })
  @ApiOperation({ summary: 'Delete i18n' })
  @UseInterceptors(LoggingInterceptor)
  @Delete('/i18n/:id/delete')
  async delete_soft_alias(@Param() param) {
    return await this.i18nService.delete_soft(param.id)
  }
}
