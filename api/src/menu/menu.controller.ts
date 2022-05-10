import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger'
import { MenuService } from './menu.service'
import { Authorization } from '../decorator/auth.decorator'
import { JwtAuthGuard } from '../guard/jwt.guard'
import { MenuAddDTO } from './dto/menu.add.dto'
import { LoggingInterceptor } from '../interceptor/logging'
import { MenuEditDTO } from './dto/menu.edit.dto'
import { isJsonString } from '../mod.lib'

@Controller('menu')
@ApiTags('menu')
export class MenuController {
  constructor(
    private menuService: MenuService
  ) { }

  private logger = new Logger('HTTP')

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get()
  async list () {
    return await this.menuService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get('tree')
  async tree () {
    return await this.menuService.tree_grouper()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get('tree/manager')
  async tree_manager () {
    return await this.menuService.tree_manager()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get('tree/manager/paginate')
  async tree_manager_paginate (
    @Query('first') first: number,
    @Query('rows') rows: number,
    @Query('sortOrder') sortOrder: number,
    @Query('sortField') sortField: string,
    @Query('filters') filters: any
  ) {
    const filterSet = (isJsonString(filters)) ? JSON.parse(filters) : {}
    const data = await this.menuService.tree_manager_paginate({
      rows: rows,
      first: first,
      sortOrder: sortOrder,
      sortField: sortField,
      filter: filterSet
    })
    return data
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id'
  })
  @Get(':id/detail')
  async detail (@Param() param) {
    return await this.menuService.detail(param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('add')
  async add (@Body() data: MenuAddDTO) {
    return await this.menuService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'id'
  })
  @Put(':id/edit')
  async edit (@Body() data: MenuEditDTO, @Param() param) {
    return await this.menuService.edit(data, param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id'
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':id/delete')
  async delete_soft (@Param() param) {
    return await this.menuService.delete_soft(param.id)
  }

}
