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
import { LoggingInterceptor } from '../../interceptor/logging'
import { Authorization } from '../../decorator/auth.decorator'
import { JwtAuthGuard } from '../../guard/jwt.guard'
import { MasterItemService } from './master.item.service'
import { MasterItemAddDTO } from './dto/master.item.add.dto'
import { MasterItemAliasAddDTO } from './dto/master.item.alias.add.dto'
import { MasterItemAliasEditDTO } from './dto/master.item.alias.edit.dto'
import { MasterItemEditDTO } from './dto/master.item.edit.dto'

@Controller('master')
@ApiTags('master')
export class MasterItemController {
  constructor(private masterItemService: MasterItemService) {}

  private logger = new Logger('HTTP')

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List master item' })
  @Authorization(true)
  @Get('/item')
  async list() {
    return await this.masterItemService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @ApiOperation({ summary: 'Get item detail' })
  @Get('/item/:uid/detail')
  async detail(@Param() param) {
    return await this.masterItemService.detail(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @ApiOperation({
    summary: 'Delete master item. It will delete aliases as well',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete('/item/:uid/delete')
  async delete_soft(@Param() param) {
    return await this.masterItemService.master_item_delete_soft(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({ summary: 'Delete master item alias' })
  @UseInterceptors(LoggingInterceptor)
  @Delete('/item/alias/:id/delete')
  async delete_soft_alias(@Param() param) {
    return await this.masterItemService.master_item_alias_delete_soft(param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put('/item/alias/:id/edit')
  async alias_edit(@Body() data: MasterItemAliasEditDTO, @Param() param) {
    return await this.masterItemService.edit_alias(data, param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put('/item/:uid/edit')
  async edit(@Body() data: MasterItemEditDTO, @Param() param) {
    return await this.masterItemService.edit(data, param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add master item' })
  @Authorization(true)
  @Post('/item/add')
  @UseInterceptors(LoggingInterceptor)
  async add(@Body() data: MasterItemAddDTO) {
    return await this.masterItemService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add master item alias' })
  @Authorization(true)
  @Post('/item/alias/add')
  @UseInterceptors(LoggingInterceptor)
  async add_alias(@Body() data: MasterItemAliasAddDTO) {
    return await this.masterItemService.add_alias(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @ApiOperation({ summary: 'List of an item aliases' })
  @Get('/item/alias/:uid')
  async item_alias(@Param() param) {
    return await this.masterItemService.item_alias(param.uid)
  }
}
